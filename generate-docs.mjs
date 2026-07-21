#!/usr/bin/env node
// Generates the actual doc pages from the extracted graphs: one page per
// controller *action* whose flow crosses a module boundary or touches an
// async event (skips pure single-module CRUD - 719 actions exist across 266
// controllers, most have no cross-cutting story worth documenting), grouped
// into one subfolder per originating module/service (matching how every
// other area of the docs site groups by folder - a flat list of 40+ files
// gives the sidebar nothing to group by), plus an index page.
//
// Everything here is derived data - regenerate by re-running this script
// whenever the source repos change. Do not hand-edit the output files.

import fs from "fs";
import path from "path";
import { buildEventGraph } from "./extract-event-graph.mjs";
import { buildCommandGraph } from "./extract-command-graph.mjs";
import { buildGatewayRoutes, resolvePublicUrl } from "./extract-gateway-routes.mjs";
import { DiagramBuilder } from "./generate-flow-diagram.mjs";
import { humanizeIdentifier, buildClassHierarchy } from "./lib/cs-scan.mjs";

const OUT_DIR = "/Users/michael/Projects/Processity.Docs/docs/flows";
// Files this script doesn't own and must not delete when clearing old output.
const PRESERVE = new Set(["frontend-api-inconsistencies.md"]);

// Event names are dotted identifiers like "tenant.provisioning.initiated",
// not PascalCase - humanizeIdentifier (built for C# class/method names)
// doesn't split on dots, so this is a small dedicated humanizer for them.
function humanizeEventName(name) {
  return name
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function sanitizeFilename(name) {
  return name
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// "Backend/Communications" -> docs/flows/Backend/Communications/ ; a plain
// module name like "Calendar" -> docs/flows/Calendar/. Module strings
// already come out of moduleFromPath() as real repo/folder names, so no
// further sanitizing is needed.
function moduleDir(module) {
  return path.join(OUT_DIR, ...module.split("/"));
}

function isInteresting(builder, seedModule) {
  const touchesEvent = [...builder.nodeIds.keys()].some((k) => k.startsWith("EVT:"));
  const touchesOtherModule = [...builder.moduleIds.keys()].some((m) => m !== seedModule);
  return touchesEvent || touchesOtherModule;
}

function cleanGeneratedDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (PRESERVE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    fs.rmSync(full, { recursive: true, force: true });
  }
}

function main() {
  console.error("Building event graph...");
  const eventGraph = buildEventGraph();
  console.error("Building command graph...");
  const commandGraph = buildCommandGraph();
  console.error("Building gateway routes...");
  const gatewayRoutes = buildGatewayRoutes();
  console.error("Building class hierarchy...");
  const classHierarchy = buildClassHierarchy();

  const eventsByName = new Map(eventGraph.map((n) => [n.eventName, n]));
  const requestsByType = new Map(commandGraph.requests.map((r) => [r.requestType, r]));
  const endpointsByController = new Map();
  for (const ep of commandGraph.endpoints) {
    if (!endpointsByController.has(ep.controllerClass)) {
      endpointsByController.set(ep.controllerClass, []);
    }
    endpointsByController.get(ep.controllerClass).push(ep);
  }

  // Group by (controllerClass, actionMethod) - one entry per HTTP action,
  // not per controller. actionMethod resolves for effectively every
  // endpoint in this codebase (0 misses out of 719 at last check); an
  // unresolved one just falls back to being its own single-endpoint group
  // keyed by route instead of method name.
  const actionGroups = new Map(); // key -> { controllerClass, actionMethod, endpoints }
  for (const ep of commandGraph.endpoints) {
    const key = `${ep.controllerClass}::${ep.actionMethod || ep.routeSegment || ep.httpMethod}`;
    if (!actionGroups.has(key)) {
      actionGroups.set(key, { controllerClass: ep.controllerClass, actionMethod: ep.actionMethod, endpoints: [] });
    }
    actionGroups.get(key).endpoints.push(ep);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Clean previously generated pages/folders so removed/renamed actions or
  // modules don't leave stale files behind.
  cleanGeneratedDir(OUT_DIR);

  // First pass: build every interesting action's diagram + a candidate
  // (not yet disambiguated) human title, so we know which titles collide
  // before touching the filesystem.
  const candidates = [];
  for (const { controllerClass, actionMethod, endpoints } of actionGroups.values()) {
    const builder = new DiagramBuilder(eventsByName, requestsByType, endpointsByController, classHierarchy);
    builder.visitController(controllerClass, 5, actionMethod);

    if (!isInteresting(builder, endpoints[0].module)) continue;

    candidates.push({
      controllerClass,
      actionMethod,
      endpoints,
      mermaid: builder.toString(),
      moduleList: [...builder.moduleIds.keys()],
      nodeIdsTouched: [...builder.nodeIds.values(), ...builder.moduleIds.values()],
      edgeList: builder.edgeList.slice(),
      visitedEventNames: [...builder.visitedEvents],
      baseTitle: actionMethod ? humanizeIdentifier(actionMethod) : humanizeIdentifier(controllerClass),
    });
  }

  // Not every flow starts at an HTTP call - a scheduled job or another
  // background process can publish an event with no controller action
  // anywhere upstream of it. Any event none of the HTTP-seeded candidates
  // above ever reached is exactly that: an automated trigger, and gets its
  // own flow page seeded directly from the event instead of an action.
  const httpCoveredEventNames = new Set();
  for (const c of candidates) for (const name of c.visitedEventNames) httpCoveredEventNames.add(name);

  for (const eventNode of eventGraph) {
    if (httpCoveredEventNames.has(eventNode.eventName)) continue;

    const builder = new DiagramBuilder(eventsByName, requestsByType, endpointsByController, classHierarchy);
    builder.visitEvent(eventNode.eventName, 5);

    // Attribute the flow to the event's own publisher module when known
    // (the real "where this automated trigger originates"); fall back to
    // whichever module reacts to it if no producer was extracted, since a
    // flow page still needs some folder to live in.
    const originModule = eventNode.producers[0]?.module || eventNode.consumers[0]?.module;
    if (!originModule) continue;

    candidates.push({
      controllerClass: null,
      actionMethod: null,
      endpoints: null,
      isAutomatedTrigger: true,
      seedEventName: eventNode.eventName,
      originModule,
      mermaid: builder.toString(),
      moduleList: [...builder.moduleIds.keys()],
      nodeIdsTouched: [...builder.nodeIds.values(), ...builder.moduleIds.values()],
      edgeList: builder.edgeList.slice(),
      visitedEventNames: [...builder.visitedEvents],
      baseTitle: humanizeEventName(eventNode.eventName),
    });
  }

  const titleCounts = new Map();
  for (const c of candidates) titleCounts.set(c.baseTitle, (titleCounts.get(c.baseTitle) || 0) + 1);

  const generated = [];
  for (const c of candidates) {
    // Automated triggers have no controller to derive a disambiguation
    // suffix from - the event name itself is already the unique thing
    // distinguishing it from an unrelated flow that happens to share a
    // humanized title.
    const disambiguator = c.isAutomatedTrigger
      ? c.seedEventName
      : humanizeIdentifier(c.controllerClass.replace(/Controller$/, ""));
    const title = titleCounts.get(c.baseTitle) > 1 ? `${c.baseTitle} (${disambiguator})` : c.baseTitle;
    const slug = sanitizeFilename(title);
    const module = c.isAutomatedTrigger ? c.originModule : c.endpoints[0].module;
    // Used only for the index page's "(...)" origin hint - an event name
    // reads fine there in the same slot a controller class normally would.
    const originLabel = c.isAutomatedTrigger ? c.seedEventName : c.controllerClass;

    const originSection = c.isAutomatedTrigger
      ? `- **Trigger**: automatically published event \`${c.seedEventName}\` (no HTTP endpoint - fired by a background process or another handler)`
      : `- **Controller**: ${c.controllerClass}${c.actionMethod ? `.${c.actionMethod}` : ""}\n- **Endpoints**:\n${c.endpoints
          .map((e) => {
            const internalPath = `${e.routeTemplate || ""}${e.routeSegment ? "/" + e.routeSegment : ""}`;
            const publicUrl = resolvePublicUrl(gatewayRoutes, internalPath, e.httpMethod);
            return publicUrl
              ? `  - \`${e.httpMethod} ${publicUrl}\` (via ApiGateway; internally \`${internalPath}\`)`
              : `  - \`${e.httpMethod} ${internalPath}\` (no ApiGateway route resolved)`;
          })
          .join("\n")}`;

    const content = `---
type: flows
---

# ${title}

**Auto-generated from code — do not hand-edit.** Regenerate with
\`tools/generate-docs.mjs\` in the docs repo whenever the source repos change.

${originSection}
- **Module**: ${module}
- **Modules touched by this flow**: ${c.moduleList.join(", ")}

\`\`\`mermaid
${c.mermaid}
\`\`\`
`;
    const dir = moduleDir(module);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${slug}.md`), content);
    generated.push({
      title,
      controllerClass: originLabel,
      module,
      modulesTouched: c.moduleList,
      relPath: `${module}/${slug}.md`,
      candidate: c,
    });
  }

  generated.sort((a, b) => a.module.localeCompare(b.module) || a.title.localeCompare(b.title));

  const byModule = new Map();
  for (const g of generated) {
    if (!byModule.has(g.module)) byModule.set(g.module, []);
    byModule.get(g.module).push(g);
  }

  const indexSections = [...byModule.entries()]
    .map(([module, items]) => {
      const links = items
        .map((i) => `- [${i.title}](#/flows/${i.relPath.replace(/\.md$/, "")}) (${i.controllerClass}) — touches ${i.modulesTouched.join(", ")}`)
        .join("\n");
      return `## ${module}\n\n${links}`;
    })
    .join("\n\n");

  const { section: overviewSection, continuationsByPath } = buildOverviewGraphSection(
    candidates,
    generated,
    eventsByName,
    requestsByType,
    endpointsByController,
    classHierarchy,
  );

  // The per-flow pages above were already written before continuesInto
  // could be computed (it needs flowsByNode, which needs every flow's own
  // page to already exist) - patch each one now with a "Continues into"
  // section pointing at whatever separately-generated flow picks up where
  // this one's own trace runs out.
  for (const g of generated) {
    const continuesInto = continuationsByPath.get(`flows/${g.relPath.replace(/\.md$/, "")}`);
    if (!continuesInto || continuesInto.length === 0) continue;
    const filePath = path.join(OUT_DIR, g.relPath);
    const links = continuesInto.map((f) => `- [${f.title}](#/${f.path})`).join("\n");
    fs.appendFileSync(
      filePath,
      `\n## Continues Into\n\nThis flow's own trace ends before these, but they pick up from a node it touches:\n\n${links}\n`,
    );
  }

  const indexContent = `---
type: flows
---

# Event & Command Flows

**Auto-generated from code — do not hand-edit.** Regenerate with
\`tools/generate-docs.mjs\` in the docs repo.

Traces what actually happens when an HTTP endpoint is called: which
command/query it dispatches, which handler processes it, and — when the
handler goes on to publish an event or call another command — what happens
next, across module and service boundaries. Source: \`[EventCatalog]\`,
\`[CapSubscribe]\`, controller \`[Route]\`/\`[HttpGet]\` etc. attributes,
\`IRequestHandler<T>\`, and \`PublishAsync\`/\`mediator.Send\` call sites in
the actual C# source.

Not every flow starts at an HTTP call: an event with no controller action
anywhere upstream of it is an automated trigger - published by a scheduled
job or another handler - and gets its own flow page too, seeded from the
event itself instead of an endpoint.

Only actions whose flow crosses a module boundary or touches an async event
are listed here — most of the ${actionGroups.size} actions across
${endpointsByController.size} controllers in the codebase are single-module
CRUD with no cross-cutting story and are intentionally omitted.

${overviewSection}

${indexSections}
`;
  fs.writeFileSync(path.join(OUT_DIR, "index.md"), indexContent);

  const automatedCount = candidates.filter((c) => c.isAutomatedTrigger).length;
  console.error(
    `Generated ${generated.length} flow pages (${generated.length - automatedCount} HTTP-triggered out of ${actionGroups.size} actions across ${endpointsByController.size} controllers, ${automatedCount} automated-trigger) + index, in ${OUT_DIR}`,
  );
}

// One compound graph with every module that participates in any generated
// flow as a collapsible parent node, and the real commands/queries/events/
// endpoints touched inside it as children - re-running visitController on a
// single SHARED builder (instead of the fresh-per-action one used for each
// flow's own page above) unions every interesting flow's nodes and edges
// into one deduplicated graph, since DiagramBuilder's visited-sets carry
// across calls. Rendered client-side as plain DOM/SVG (see
// viewer/src/components/overview-graph.ts): modules start collapsed
// (mermaid-style module overview), and expand on click to reveal their real
// internal nodes/edges - mermaid can only draw a fixed picture, it has no
// notion of a node being an expandable group.
function buildOverviewGraphSection(candidates, generated, eventsByName, requestsByType, endpointsByController, classHierarchy) {
  if (candidates.length === 0) return "";

  const shared = new DiagramBuilder(eventsByName, requestsByType, endpointsByController, classHierarchy);
  for (const c of candidates) {
    if (c.isAutomatedTrigger) shared.visitEvent(c.seedEventName, 5);
    else shared.visitController(c.controllerClass, 5, c.actionMethod);
  }

  // shared.edgeList is incomplete for any node reached by more than one
  // candidate: DiagramBuilder's visited-tracking (built so a widely-shared
  // node's box/metadata is only created once, not once per candidate) means
  // only the FIRST candidate to reach a node through this sequential
  // re-traversal gets its own caller/producer edge recorded here - every
  // OTHER candidate that also legitimately dispatches/produces that same
  // node from a different class silently loses its edge in the shared
  // graph, even though it's present and correct in that candidate's own
  // independent edgeList (each traced with its own fresh, unshared
  // builder). Replace the edge list with a union of every candidate's own
  // edges instead - shared.nodeMeta/moduleIds/nodeOwnerModule from the
  // traversal above are still needed for node identity/metadata and are
  // kept as-is; only completeness of the EDGES needed fixing.
  const seenSharedEdgeKeys = new Set();
  const unionedEdges = [];
  for (const c of candidates) {
    for (const e of c.edgeList) {
      const key = `${e.from}->${e.to}->${e.label || ""}`;
      if (seenSharedEdgeKeys.has(key)) continue;
      seenSharedEdgeKeys.add(key);
      unionedEdges.push(e);
    }
  }
  shared.edgeList = unionedEdges;

  const sanitizeId = (text) => text.replace(/[^A-Za-z0-9_]/g, "_");
  const moduleIdSet = new Set(shared.moduleIds.values());

  // Most cross-module event/command traffic never gets a dedicated node:
  // DiagramBuilder draws e.g. "event -> consumer's module" directly, with
  // the actual handler class living only in the edge's label (see
  // visitEvent/visitRequest in generate-flow-diagram.mjs - correct for the
  // per-flow pages, which show the class name right there on the arrow).
  // The overview has no arrow to put a label on once collapsed to a
  // module box, so without this there'd be nothing concrete to expand
  // into for the vast majority of cross-module relations - only the
  // minority that happen to chain into a further dispatch got their own
  // node. Synthesize a real node per (module, class-name) pair from that
  // label instead, and reroute the edge through it.
  // A command/query has exactly one handler (DiagramBuilder.visitRequest
  // only ever draws one `reqId -> module` edge, right after `if
  // (node.handler)`) - a separate box for "the one thing that processes
  // this" is pure duplication of the command/query node right next to it,
  // unlike an event (which can have several independent consumers, where
  // the fan-out is the whole point). So that specific edge shape folds
  // into the request node itself as a tooltip instead of a synthetic node.
  // Shared so a per-candidate call (below, for flow edge ordering) produces
  // the exact same synthetic node ids as this shared-graph call - both are
  // deterministic functions of (moduleId, label), so the two are directly
  // comparable without needing to reconcile two different id schemes.
  // A handler is an actor that does something, regardless of what kind of
  // thing triggered it (event, command, or query) - it always gets its own
  // node. Commands/queries are just data being dispatched, not actors, so
  // they never get to "absorb" their handler into a tooltip; the synthetic
  // node id is a deterministic function of (moduleId, label), so whichever
  // side of the handler's work an edge comes from (being triggered, or
  // going on to trigger something else) converges on the exact same node.
  function rewriteEdges(edgeList) {
    const synthNodes = new Map(); // synthId -> { label, moduleId }
    const rewrittenEdges = [];
    for (const e of edgeList) {
      const targetIsModule = moduleIdSet.has(e.to);
      const sourceIsModule = moduleIdSet.has(e.from);

      if (targetIsModule && e.label) {
        const synthId = `SYN_${sanitizeId(e.to)}_${sanitizeId(e.label)}`;
        if (!synthNodes.has(synthId)) synthNodes.set(synthId, { label: e.label, moduleId: e.to });
        rewrittenEdges.push({ from: e.from, to: synthId, label: "" });
      } else if (sourceIsModule && e.label) {
        const synthId = `SYN_${sanitizeId(e.from)}_${sanitizeId(e.label)}`;
        if (!synthNodes.has(synthId)) synthNodes.set(synthId, { label: e.label, moduleId: e.from });
        rewrittenEdges.push({ from: synthId, to: e.to, label: "" });
      } else {
        rewrittenEdges.push(e);
      }
    }
    return { synthNodes, rewrittenEdges };
  }

  const { synthNodes, rewrittenEdges } = rewriteEdges(shared.edgeList);

  const elements = [];
  for (const [module, modId] of shared.moduleIds) {
    elements.push({ data: { id: modId, label: module, isModule: true } });
  }
  for (const nodeId of shared.nodeIds.values()) {
    const meta = shared.nodeMeta.get(nodeId) || { kind: "unknown", label: nodeId };
    const parent = shared.nodeOwnerModule.get(nodeId);
    elements.push({
      data: {
        id: nodeId,
        label: meta.label,
        kind: meta.kind,
        ...(parent && { parent }),
      },
    });
  }
  for (const [synthId, { label, moduleId }] of synthNodes) {
    elements.push({ data: { id: synthId, label, kind: "handler", parent: moduleId } });
  }
  let edgeIdx = 0;
  for (const e of rewrittenEdges) {
    elements.push({ data: { id: `E${edgeIdx++}`, source: e.from, target: e.to, label: e.label } });
  }

  // nodeId (module OR fine-grained command/event/endpoint) -> flows that
  // touch it, so clicking any node - collapsed module or expanded detail -
  // can list+link the flows it participates in.
  const flowsByNode = new Map();
  for (const g of generated) {
    const c = g.candidate;
    const path = `flows/${g.relPath.replace(/\.md$/, "")}`;
    for (const nodeId of c.nodeIdsTouched) {
      if (!flowsByNode.has(nodeId)) flowsByNode.set(nodeId, []);
      flowsByNode.get(nodeId).push({ title: g.title, path });
    }
  }
  // A synthetic handler node has no direct flow of its own - it's a
  // stand-in for a class the extractor only ever saw as an edge label -
  // so it borrows its owning module's flow list as the closest real answer.
  for (const [synthId, { moduleId }] of synthNodes) {
    if (flowsByNode.has(moduleId)) flowsByNode.set(synthId, flowsByNode.get(moduleId));
  }

  // One entry per generated flow page, with the module ids it touches -
  // drives the "jump to a flow" selector, which expands exactly those
  // modules instead of making the user click through them one at a time.
  const flowList = [];
  for (const g of generated) {
    const c = g.candidate;
    const moduleIds = c.moduleList.map((m) => shared.moduleIds.get(m)).filter(Boolean);
    // This flow's own edges, rewritten with the same synthetic-node scheme
    // as the shared graph (so ids line up) and deduped in first-discovery
    // order - the client numbers arrows 1, 2, 3... by position in this
    // list, since that reflects the actual order DiagramBuilder traced the
    // dispatch chain for this specific action.
    const { rewrittenEdges: flowEdges } = rewriteEdges(c.edgeList);
    const seenEdgeKeys = new Set();
    const orderedEdges = [];
    for (const e of flowEdges) {
      const key = `${e.from}=>${e.to}`;
      if (seenEdgeKeys.has(key)) continue;
      seenEdgeKeys.add(key);
      orderedEdges.push({ from: e.from, to: e.to });
    }

    // nodeIds is the flow's own full touched-node set (from its own,
    // pre-rewrite builder pass) - used client-side to restrict the
    // overview's edges to only the ones actually part of this flow,
    // instead of every edge that happens to connect its expanded modules.
    flowList.push({
      title: g.title,
      path: `flows/${g.relPath.replace(/\.md$/, "")}`,
      module: g.module,
      moduleIds,
      nodeIds: c.nodeIdsTouched,
      edges: orderedEdges,
      startNodeId: c.isAutomatedTrigger
        ? `EVT_${sanitizeId(c.seedEventName)}`
        : `EP_${sanitizeId(c.controllerClass + (c.actionMethod || ""))}`,
    });
  }
  // A flow's own trace can dead-end at a node (hop budget, or a handoff to
  // a module with no single onward node to point at) that's ALSO where a
  // SEPARATELY-generated flow picks up - e.g. Register Tenant ends at
  // TenantLicensesActivatedHandler, and Module Provisioning Completed /
  // Service Registered / etc. are all their own independent flow pages
  // that also touch that same node. Reusing flowsByNode (already built
  // above) at exactly the nodes where THIS flow's own trace has no further
  // outgoing edge turns those disconnected islands into a discoverable
  // trail, without inlining everything into one unreadable diagram.
  for (const flow of flowList) {
    const edgeNodeIds = flow.edges.flatMap((e) => [e.from, e.to]);
    const allIds = new Set([...flow.nodeIds, ...edgeNodeIds]);
    const hasOutgoing = new Set(flow.edges.map((e) => e.from));
    // Bare module ids are excluded here - c.nodeIdsTouched always includes
    // every module a flow touches, so a module would trivially qualify as
    // "leaf" (it's never anyone's edge source) regardless of where the
    // trace actually stopped, double-counting against the specific
    // synthetic handler node that already borrows the exact same broad
    // per-module flow list.
    const leafIds = [...allIds].filter((id) => !hasOutgoing.has(id) && !moduleIdSet.has(id));
    const seenPaths = new Set([flow.path]);
    const continuesInto = [];
    for (const leafId of leafIds) {
      for (const entry of flowsByNode.get(leafId) || []) {
        if (seenPaths.has(entry.path)) continue;
        seenPaths.add(entry.path);
        continuesInto.push(entry);
      }
    }
    flow.continuesInto = continuesInto;
  }

  flowList.sort((a, b) => a.module.localeCompare(b.module) || a.title.localeCompare(b.title));

  const payload = {
    elements,
    flows: Object.fromEntries(flowsByNode),
    flowList,
  };

  const section = `## Overview

Every module involved in at least one documented flow, collapsed by
default. Click a module to expand it and reveal the real commands, queries,
events and endpoints inside - and the edges between them. Click any node
(collapsed module or expanded detail) to list the flows it's part of.

\`\`\`overview-graph
${JSON.stringify(payload)}
\`\`\`
`;

  const continuationsByPath = new Map(flowList.map((f) => [f.path, f.continuesInto]));
  return { section, continuationsByPath };
}

main();
