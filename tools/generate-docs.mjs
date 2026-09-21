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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEventGraph } from "./extract-event-graph.mjs";
import { buildCommandGraph } from "./extract-command-graph.mjs";
import {
  buildGatewayRoutes,
  resolvePublicUrl,
} from "./extract-gateway-routes.mjs";
import { DiagramBuilder } from "./generate-flow-diagram.mjs";
import { humanizeIdentifier, buildClassHierarchy } from "./lib/cs-scan.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "docs", "flows");
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
  let result = name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+/, "");

  // Remove trailing dashes
  while (result.endsWith("-")) {
    result = result.slice(0, -1);
  }

  return result.toLowerCase();
}

// "Backend/Communications" -> docs/flows/Backend/Communications/ ; a plain
// module name like "Calendar" -> docs/flows/Calendar/. Module strings
// already come out of moduleFromPath() as real repo/folder names, so no
// further sanitizing is needed.
function moduleDir(module) {
  return path.join(OUT_DIR, ...module.split("/"));
}

function isInteresting(builder, seedModule) {
  const touchesEvent = [...builder.nodeIds.keys()].some((k) =>
    k.startsWith("EVT:"),
  );
  const touchesOtherModule = [...builder.moduleIds.keys()].some(
    (m) => m !== seedModule,
  );
  return touchesEvent || touchesOtherModule;
}

function cleanGeneratedDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (PRESERVE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    fs.rmSync(full, { recursive: true, force: true });
  }
}

function buildGraphMaps(eventGraph, commandGraph) {
  const eventsByName = new Map(eventGraph.map((n) => [n.eventName, n]));
  const requestsByType = new Map(
    commandGraph.requests.map((r) => [r.requestType, r]),
  );
  const endpointsByController = new Map();
  for (const ep of commandGraph.endpoints) {
    if (!endpointsByController.has(ep.controllerClass)) {
      endpointsByController.set(ep.controllerClass, []);
    }
    endpointsByController.get(ep.controllerClass).push(ep);
  }
  return { eventsByName, requestsByType, endpointsByController };
}

function groupEndpointsByAction(commandGraph) {
  const actionGroups = new Map();
  for (const ep of commandGraph.endpoints) {
    const key = `${ep.controllerClass}::${ep.actionMethod || ep.routeSegment || ep.httpMethod}`;
    if (!actionGroups.has(key)) {
      actionGroups.set(key, {
        controllerClass: ep.controllerClass,
        actionMethod: ep.actionMethod,
        endpoints: [],
      });
    }
    actionGroups.get(key).endpoints.push(ep);
  }
  return actionGroups;
}

function buildHttpTriggeredCandidates(
  actionGroups,
  eventsByName,
  requestsByType,
  endpointsByController,
  classHierarchy,
) {
  const candidates = [];
  for (const {
    controllerClass,
    actionMethod,
    endpoints,
  } of actionGroups.values()) {
    const builder = new DiagramBuilder(
      eventsByName,
      requestsByType,
      endpointsByController,
      classHierarchy,
    );
    builder.visitController(controllerClass, 5, actionMethod);

    if (!isInteresting(builder, endpoints[0].module)) continue;

    candidates.push({
      controllerClass,
      actionMethod,
      endpoints,
      mermaid: builder.toString(),
      moduleList: [...builder.moduleIds.keys()],
      nodeIdsTouched: [
        ...builder.nodeIds.values(),
        ...builder.moduleIds.values(),
      ],
      edgeList: builder.edgeList.slice(),
      visitedEventNames: [...builder.visitedEvents],
      baseTitle: actionMethod
        ? humanizeIdentifier(actionMethod)
        : humanizeIdentifier(controllerClass),
    });
  }
  return candidates;
}

function buildAutomatedTriggerCandidates(
  eventGraph,
  candidates,
  eventsByName,
  requestsByType,
  endpointsByController,
  classHierarchy,
) {
  const httpCoveredEventNames = new Set();
  for (const c of candidates)
    for (const name of c.visitedEventNames) httpCoveredEventNames.add(name);

  const automatedCandidates = [];
  for (const eventNode of eventGraph) {
    if (httpCoveredEventNames.has(eventNode.eventName)) continue;

    const builder = new DiagramBuilder(
      eventsByName,
      requestsByType,
      endpointsByController,
      classHierarchy,
    );
    builder.visitEvent(eventNode.eventName, 5);

    const originModule =
      eventNode.producers[0]?.module || eventNode.consumers[0]?.module;
    if (!originModule) continue;

    automatedCandidates.push({
      controllerClass: null,
      actionMethod: null,
      endpoints: null,
      isAutomatedTrigger: true,
      seedEventName: eventNode.eventName,
      originModule,
      mermaid: builder.toString(),
      moduleList: [...builder.moduleIds.keys()],
      nodeIdsTouched: [
        ...builder.nodeIds.values(),
        ...builder.moduleIds.values(),
      ],
      edgeList: builder.edgeList.slice(),
      visitedEventNames: [...builder.visitedEvents],
      baseTitle: humanizeEventName(eventNode.eventName),
    });
  }
  return automatedCandidates;
}

function generateFlowPages(candidates, gatewayRoutes) {
  const titleCounts = new Map();
  for (const c of candidates)
    titleCounts.set(c.baseTitle, (titleCounts.get(c.baseTitle) || 0) + 1);

  const generated = [];
  for (const c of candidates) {
    const disambiguator = c.isAutomatedTrigger
      ? c.seedEventName
      : humanizeIdentifier(c.controllerClass.replace(/Controller$/, ""));
    const title =
      titleCounts.get(c.baseTitle) > 1
        ? `${c.baseTitle} (${disambiguator})`
        : c.baseTitle;
    const slug = sanitizeFilename(title);
    const module = c.isAutomatedTrigger
      ? c.originModule
      : c.endpoints[0].module;
    const originLabel = c.isAutomatedTrigger
      ? c.seedEventName
      : c.controllerClass;
    const actionMethodSuffix = c.actionMethod ? `.${c.actionMethod}` : "";

    const originSection = c.isAutomatedTrigger
      ? `- **Trigger**: automatically published event \`${c.seedEventName}\` (no HTTP endpoint - fired by a background process or another handler)`
      : `- **Controller**: ${c.controllerClass}${actionMethodSuffix}\n- **Endpoints**:\n${c.endpoints
          .map((e) => {
            const internalPath = `${e.routeTemplate || ""}${e.routeSegment ? "/" + e.routeSegment : ""}`;
            const publicUrl = resolvePublicUrl(
              gatewayRoutes,
              internalPath,
              e.httpMethod,
            );
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
  return generated;
}

function buildIndexContent(
  generated,
  actionGroups,
  endpointsByController,
  overviewSection,
) {
  generated.sort(
    (a, b) =>
      a.module.localeCompare(b.module) || a.title.localeCompare(b.title),
  );

  const byModule = new Map();
  for (const g of generated) {
    if (!byModule.has(g.module)) byModule.set(g.module, []);
    byModule.get(g.module).push(g);
  }

  const indexSections = [...byModule.entries()]
    .map(([module, items]) => {
      const links = items
        .map(
          (i) =>
            `- [${i.title}](#/flows/${i.relPath.replace(/\.md$/, "")}) (${i.controllerClass}) — touches ${i.modulesTouched.join(", ")}`,
        )
        .join("\n");
      return `## ${module}\n\n${links}`;
    })
    .join("\n\n");

  return `---
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
}

function patchContinuesIntoSections(generated, continuationsByPath) {
  for (const g of generated) {
    const continuesInto = continuationsByPath.get(
      `flows/${g.relPath.replace(/\.md$/, "")}`,
    );
    if (!continuesInto || continuesInto.length === 0) continue;
    const filePath = path.join(OUT_DIR, g.relPath);
    const links = continuesInto
      .map((f) => `- [${f.title}](#/${f.path})`)
      .join("\n");
    fs.appendFileSync(
      filePath,
      `\n## Continues Into\n\nThis flow's own trace ends before these, but they pick up from a node it touches:\n\n${links}\n`,
    );
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

  const { eventsByName, requestsByType, endpointsByController } =
    buildGraphMaps(eventGraph, commandGraph);
  const actionGroups = groupEndpointsByAction(commandGraph);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  cleanGeneratedDir(OUT_DIR);

  const candidates = buildHttpTriggeredCandidates(
    actionGroups,
    eventsByName,
    requestsByType,
    endpointsByController,
    classHierarchy,
  );
  const automatedCandidates = buildAutomatedTriggerCandidates(
    eventGraph,
    candidates,
    eventsByName,
    requestsByType,
    endpointsByController,
    classHierarchy,
  );
  candidates.push(...automatedCandidates);

  const generated = generateFlowPages(candidates, gatewayRoutes);

  const { section: overviewSection, continuationsByPath } =
    buildOverviewGraphSection(
      candidates,
      generated,
      eventsByName,
      requestsByType,
      endpointsByController,
      classHierarchy,
    );

  patchContinuesIntoSections(generated, continuationsByPath);

  const indexContent = buildIndexContent(
    generated,
    actionGroups,
    endpointsByController,
    overviewSection,
  );
  fs.writeFileSync(path.join(OUT_DIR, "index.md"), indexContent);

  const automatedCount = candidates.filter((c) => c.isAutomatedTrigger).length;
  console.error(
    `Generated ${generated.length} flow pages (${generated.length - automatedCount} HTTP-triggered out of ${actionGroups.size} actions across ${endpointsByController.size} controllers, ${automatedCount} automated-trigger) + index, in ${OUT_DIR}`,
  );
}

function buildSharedDiagram(
  candidates,
  eventsByName,
  requestsByType,
  endpointsByController,
  classHierarchy,
) {
  const shared = new DiagramBuilder(
    eventsByName,
    requestsByType,
    endpointsByController,
    classHierarchy,
  );
  for (const c of candidates) {
    if (c.isAutomatedTrigger) shared.visitEvent(c.seedEventName, 5);
    else shared.visitController(c.controllerClass, 5, c.actionMethod);
  }
  return shared;
}

function unionEdgeLists(candidates) {
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
  return unionedEdges;
}

function rewriteEdgesHelper(edgeList, moduleIdSet, sanitizeId) {
  const synthNodes = new Map(); // synthId -> { label, moduleId }
  const rewrittenEdges = [];
  for (const e of edgeList) {
    const targetIsModule = moduleIdSet.has(e.to);
    const sourceIsModule = moduleIdSet.has(e.from);

    if (targetIsModule && e.label) {
      const synthId = `SYN_${sanitizeId(e.to)}_${sanitizeId(e.label)}`;
      if (!synthNodes.has(synthId))
        synthNodes.set(synthId, { label: e.label, moduleId: e.to });
      rewrittenEdges.push({ from: e.from, to: synthId, label: "" });
    } else if (sourceIsModule && e.label) {
      const synthId = `SYN_${sanitizeId(e.from)}_${sanitizeId(e.label)}`;
      if (!synthNodes.has(synthId))
        synthNodes.set(synthId, { label: e.label, moduleId: e.from });
      rewrittenEdges.push({ from: synthId, to: e.to, label: "" });
    } else {
      rewrittenEdges.push(e);
    }
  }
  return { synthNodes, rewrittenEdges };
}

function buildGraphElements(shared, synthNodes, rewrittenEdges) {
  const elements = [];
  for (const [module, modId] of shared.moduleIds) {
    elements.push({ data: { id: modId, label: module, isModule: true } });
  }
  for (const nodeId of shared.nodeIds.values()) {
    const meta = shared.nodeMeta.get(nodeId) || {
      kind: "unknown",
      label: nodeId,
    };
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
    elements.push({
      data: { id: synthId, label, kind: "handler", parent: moduleId },
    });
  }
  let edgeIdx = 0;
  for (const e of rewrittenEdges) {
    elements.push({
      data: {
        id: `E${edgeIdx++}`,
        source: e.from,
        target: e.to,
        label: e.label,
      },
    });
  }
  return elements;
}

function buildFlowsByNode(generated, synthNodes, flowsByNodeMap) {
  for (const [synthId, { moduleId }] of synthNodes) {
    if (flowsByNodeMap.has(moduleId))
      flowsByNodeMap.set(synthId, flowsByNodeMap.get(moduleId));
  }
}

function buildFlowList(generated, shared, rewriteEdgesFunc, sanitizeId) {
  const flowList = [];
  for (const g of generated) {
    const c = g.candidate;
    const moduleIds = c.moduleList
      .map((m) => shared.moduleIds.get(m))
      .filter(Boolean);
    const { rewrittenEdges: flowEdges } = rewriteEdgesFunc(c.edgeList);
    const seenEdgeKeys = new Set();
    const orderedEdges = [];
    for (const e of flowEdges) {
      const key = `${e.from}=>${e.to}`;
      if (seenEdgeKeys.has(key)) continue;
      seenEdgeKeys.add(key);
      orderedEdges.push({ from: e.from, to: e.to });
    }

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
  return flowList;
}

function processContinuations(flowList, flowsByNode, moduleIdSet) {
  for (const flow of flowList) {
    const edgeNodeIds = flow.edges.flatMap((e) => [e.from, e.to]);
    const allIds = new Set([...flow.nodeIds, ...edgeNodeIds]);
    const hasOutgoing = new Set(flow.edges.map((e) => e.from));
    const leafIds = [...allIds].filter(
      (id) => !hasOutgoing.has(id) && !moduleIdSet.has(id),
    );
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
}

function buildOverviewGraphSection(
  candidates,
  generated,
  eventsByName,
  requestsByType,
  endpointsByController,
  classHierarchy,
) {
  if (candidates.length === 0)
    return { section: "", continuationsByPath: new Map() };

  const shared = buildSharedDiagram(
    candidates,
    eventsByName,
    requestsByType,
    endpointsByController,
    classHierarchy,
  );
  const unionedEdges = unionEdgeLists(candidates);
  shared.edgeList = unionedEdges;

  const sanitizeId = (text) => text.replace(/\W/g, "_");
  const moduleIdSet = new Set(shared.moduleIds.values());
  const rewriteEdgesFunc = (edgeList) =>
    rewriteEdgesHelper(edgeList, moduleIdSet, sanitizeId);
  const { synthNodes, rewrittenEdges } = rewriteEdgesFunc(shared.edgeList);

  const elements = buildGraphElements(shared, synthNodes, rewrittenEdges);

  const flowsByNode = new Map();
  for (const g of generated) {
    const c = g.candidate;
    const path = `flows/${g.relPath.replace(/\.md$/, "")}`;
    for (const nodeId of c.nodeIdsTouched) {
      if (!flowsByNode.has(nodeId)) flowsByNode.set(nodeId, []);
      flowsByNode.get(nodeId).push({ title: g.title, path });
    }
  }
  buildFlowsByNode(generated, synthNodes, flowsByNode);

  const flowList = buildFlowList(
    generated,
    shared,
    rewriteEdgesFunc,
    sanitizeId,
  );
  processContinuations(flowList, flowsByNode, moduleIdSet);
  flowList.sort(
    (a, b) =>
      a.module.localeCompare(b.module) || a.title.localeCompare(b.title),
  );

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

  const continuationsByPath = new Map(
    flowList.map((f) => [f.path, f.continuesInto]),
  );
  return { section, continuationsByPath };
}

main();
