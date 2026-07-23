#!/usr/bin/env node
// Static analyzer: builds a cross-repo event trigger graph from C# source,
// without running any code. Two data sources, both already present for other
// reasons (not new conventions invented for this):
//   - [EventCatalog(...)] attributes on event record classes (built for the
//     AutomationService workflow-trigger dropdown) -> graph nodes.
//   - [CapSubscribe(...)] attributes on handler methods, and
//     PublishAsync/PublishWithAuthAsync call sites -> graph edges.
//
// Output: JSON graph to stdout (or --out <file>). No rendering yet -
// this is the "sanity check the extracted data" step.

import fs from "fs";
import path from "path";
import {
  PROJECTS_ROOT,
  REPO_NAMES,
  walkAllRepos,
  moduleFromPath,
  stripComments,
  findTypeDeclarations,
  enclosingTypeName,
  nextTypeName,
  extractBalancedAttrArgs,
} from "./lib/cs-scan.mjs";

function parseFile(filePath, state) {
  const content = fs.readFileSync(filePath, "utf-8");
  const module = moduleFromPath(filePath);
  const decls = findTypeDeclarations(stripComments(content));

  // --- EventCatalog class definitions -> nodes ---
  const catalogRe = /\[EventCatalog\(/g;
  let m;
  while ((m = catalogRe.exec(content))) {
    const argsStart = m.index + m[0].length;
    const args = extractBalancedAttrArgs(content, argsStart);

    const labelMatch = /^\s*"([^"]+)"/.exec(args);
    const descMatch = /Description\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(args);
    const categoryMatch = /Category\s*=\s*"([^"]+)"/.exec(args);

    const typeName = nextTypeName(decls, argsStart);

    const eventNameMatch = /EventName\s*=\s*"([^"]+)"/.exec(content.slice(argsStart));

    if (!eventNameMatch || !typeName) continue;

    const eventName = eventNameMatch[1];
    state.eventsByClassName.set(typeName, eventName);
    state.eventsByClassName.set(`${path.basename(filePath, ".cs")}`, eventName);

    if (!state.nodes.has(eventName)) {
      state.nodes.set(eventName, {
        eventName,
        label: labelMatch ? labelMatch[1] : eventName,
        description: descMatch ? descMatch[1].replace(/\\"/g, '"') : null,
        category: categoryMatch ? categoryMatch[1] : null,
        className: typeName,
        definedIn: module,
        definedInFile: path.relative(PROJECTS_ROOT, filePath),
        producers: [],
        consumers: [],
      });
    }
  }

  // --- Plain `public const string EventName = "..."` -> fallback class-name
  // resolution when a producer/consumer references SomeEvent.EventName but
  // SomeEvent was never decorated with [EventCatalog(...)] (that attribute
  // was built for a different feature - the AutomationService workflow-
  // trigger dropdown - and plenty of integration events predate it or were
  // never retrofitted). Without this, a ClassName.EventName reference to an
  // undecorated class silently resolves to nothing and the whole publish/
  // subscribe edge just vanishes, with no error - exactly what happened to
  // TenantCreatedEvent (no [EventCatalog], so RegisterTenant's publish and
  // both of its downstream consumers were all invisible).
  const constEventNameRe = /public\s+const\s+string\s+EventName\s*=\s*"([^"]+)"/g;
  while ((m = constEventNameRe.exec(content))) {
    const typeName = enclosingTypeName(decls, m.index);
    if (!typeName) continue;
    const literalValue = m[1];
    if (!state.eventNameConstByClassName.has(typeName)) {
      state.eventNameConstByClassName.set(typeName, literalValue);
      state.eventNameConstByClassName.set(path.basename(filePath, ".cs"), literalValue);
    }
  }

  // --- CapSubscribe -> consumer edges ---
  const subRe = /\[CapSubscribe\(\s*(?:"([^"]+)"|([A-Za-z0-9_]+)\.EventName)\s*(?:,\s*Group\s*=\s*"([^"]+)")?\s*\)\]/g;
  while ((m = subRe.exec(content))) {
    const literalName = m[1];
    const classRef = m[2];
    const group = m[3] || null;
    const handlerClass = enclosingTypeName(decls, m.index) || nextTypeName(decls, m.index);

    state.pendingSubscriptions.push({
      literalName,
      classRef,
      group,
      handlerClass,
      module,
      file: path.relative(PROJECTS_ROOT, filePath),
    });
  }

  // --- Publish call sites -> producer edges ---
  const pubRe = /\.(?:PublishWithAuthAsync|PublishAsync)\s*\(\s*(?:"([^"]+)"|([A-Za-z0-9_]+)\.EventName)/g;
  while ((m = pubRe.exec(content))) {
    const literalName = m[1];
    const classRef = m[2];
    const publisherClass = enclosingTypeName(decls, m.index);
    state.pendingPublishes.push({
      literalName,
      classRef,
      publisherClass,
      module,
      file: path.relative(PROJECTS_ROOT, filePath),
    });
  }
}

// CAP/RabbitMQ routing-key wildcards, not real event names - a literal "#"
// or "*" subscription matches any message on the exchange and shows up as
// a producer/consumer edge for every genuinely-named event too, so treating
// it as its own event would both fabricate a fake flow and double-count.
const ROUTING_KEY_WILDCARDS = new Set(["#", "*"]);

function resolveEventName(entry, eventsByClassName, eventNameConstByClassName) {
  if (entry.literalName) return ROUTING_KEY_WILDCARDS.has(entry.literalName) ? null : entry.literalName;
  if (entry.classRef) {
    return eventsByClassName.get(entry.classRef) || eventNameConstByClassName.get(entry.classRef) || null;
  }
  return null;
}

export function buildEventGraph() {
  const state = {
    nodes: new Map(),
    eventsByClassName: new Map(),
    eventNameConstByClassName: new Map(),
    pendingSubscriptions: [],
    pendingPublishes: [],
  };

  const files = walkAllRepos();

  for (const file of files) {
    parseFile(file, state);
  }

  // Second pass: resolve pending subscriptions/publishes now that the full
  // class-name -> event-name map has been built across ALL files.
  const unresolvedEvents = new Map(); // eventName -> minimal node (no catalog entry)

  function getOrCreateNode(eventName) {
    if (state.nodes.has(eventName)) return state.nodes.get(eventName);
    if (unresolvedEvents.has(eventName)) return unresolvedEvents.get(eventName);
    const node = {
      eventName,
      label: null,
      description: null,
      category: null,
      className: null,
      definedIn: null,
      definedInFile: null,
      producers: [],
      consumers: [],
    };
    unresolvedEvents.set(eventName, node);
    return node;
  }

  for (const sub of state.pendingSubscriptions) {
    const eventName = resolveEventName(sub, state.eventsByClassName, state.eventNameConstByClassName);
    if (!eventName) continue;
    const node = getOrCreateNode(eventName);
    node.consumers.push({
      module: sub.module,
      handlerClass: sub.handlerClass,
      group: sub.group,
      file: sub.file,
    });
  }

  for (const pub of state.pendingPublishes) {
    const eventName = resolveEventName(pub, state.eventsByClassName, state.eventNameConstByClassName);
    if (!eventName) continue;
    const node = getOrCreateNode(eventName);
    const exists = node.producers.some(
      (p) => p.module === pub.module && p.publisherClass === pub.publisherClass,
    );
    if (!exists) {
      node.producers.push({ module: pub.module, publisherClass: pub.publisherClass });
    }
  }

  const allNodes = [...state.nodes.values(), ...unresolvedEvents.values()];
  return allNodes
    .filter((n) => n.producers.length > 0 || n.consumers.length > 0)
    .map((n) => ({
      eventName: n.eventName,
      label: n.label,
      description: n.description,
      category: n.category,
      className: n.className,
      definedIn: n.definedIn,
      definedInFile: n.definedInFile,
      cataloged: n.label !== null,
      producers: n.producers,
      consumers: n.consumers,
    }))
    .sort((a, b) => a.eventName.localeCompare(b.eventName));
}

function main() {
  console.error(`Scanning .cs files across ${REPO_NAMES.length} repos...`);
  const graph = buildEventGraph();

  const outIdx = process.argv.indexOf("--out");
  const output = JSON.stringify(graph, null, 2);
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    fs.writeFileSync(process.argv[outIdx + 1], output);
    console.error(`Wrote ${graph.length} events to ${process.argv[outIdx + 1]}`);
  } else {
    process.stdout.write(output);
  }

  const cataloged = graph.filter((n) => n.cataloged).length;
  const crossModule = graph.filter((n) => {
    const allModules = new Set([...n.producers.map((p) => p.module), ...n.consumers.map((c) => c.module)]);
    return allModules.size > 1;
  }).length;
  console.error(
    `Total events with edges: ${graph.length} (${cataloged} cataloged with labels, ${crossModule} cross-module)`,
  );
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
