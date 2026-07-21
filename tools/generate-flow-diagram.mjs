#!/usr/bin/env node
// Turns the combined event graph (extract-event-graph.mjs) and command graph
// (extract-command-graph.mjs) into one mermaid flowchart, following a chain
// across BOTH trigger mechanisms: HTTP endpoint -> command/query dispatch ->
// handler -> event publish -> cross-module consumer -> further dispatch ->
// event -> ... Stops when it can't prove another hop from the extracted
// data - never fabricates a connection.
//
// Usage: node generate-flow-diagram.mjs <events.json> <commands.json> <seed> [options]
//   --kind event|request|controller   what <seed> identifies (default: auto-detect)
//   --hops N                          max hops to follow (default: 4)

import fs from "fs";
import { ancestorsOf } from "./lib/cs-scan.mjs";

function sanitizeId(text) {
  return text.replace(/[^A-Za-z0-9_]/g, "_");
}

function wrapLabel(text, maxLen = 28) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.join("<br/>");
}

export class DiagramBuilder {
  constructor(eventsByName, requestsByType, endpointsByController, classHierarchy = new Map()) {
    this.eventsByName = eventsByName;
    this.requestsByType = requestsByType;
    this.endpointsByController = endpointsByController;
    this.classHierarchy = classHierarchy;
    this.lines = ["flowchart TB"];
    this.moduleIds = new Map();
    this.nodeIds = new Map(); // key -> mermaid id, key is "EVT:name" | "REQ:type" | "EP:controller"
    this.edgesSeen = new Set();
    this.visitedEvents = new Set();
    this.visitedRequests = new Set();
    this.visitedControllers = new Set();
    // Structured mirror of the above, kept alongside the mermaid `lines` text
    // so a caller (e.g. the overview graph builder in generate-docs.mjs) can
    // consume the graph as data instead of re-parsing mermaid syntax.
    this.nodeMeta = new Map(); // node id -> { kind: 'event'|'request'|'endpoint', label }
    this.nodeOwnerModule = new Map(); // node id -> owning module id (for compound-graph parenting)
    this.edgeList = []; // { from, to, label }
  }

  moduleNode(mod) {
    if (!this.moduleIds.has(mod)) {
      const id = "MOD_" + sanitizeId(mod);
      this.moduleIds.set(mod, id);
      this.lines.push(`  ${id}["${mod}"]`);
    }
    return this.moduleIds.get(mod);
  }

  eventNode(eventName, label) {
    const key = "EVT:" + eventName;
    if (!this.nodeIds.has(key)) {
      const id = "EVT_" + sanitizeId(eventName);
      this.nodeIds.set(key, id);
      this.lines.push(`  ${id}{{"${wrapLabel(label || eventName)}"}}`);
      this.nodeMeta.set(id, { kind: "event", label: label || eventName });
    }
    return this.nodeIds.get(key);
  }

  requestNode(requestType, label, kind) {
    const key = "REQ:" + requestType;
    if (!this.nodeIds.has(key)) {
      const id = "REQ_" + sanitizeId(requestType);
      this.nodeIds.set(key, id);
      const shape = kind === "query" ? [`[/"${wrapLabel(label)}"/]`, ""] : [`("${wrapLabel(label)}")`, ""];
      this.lines.push(`  ${id}${shape[0]}`);
      this.nodeMeta.set(id, { kind: kind === "query" ? "query" : "command", label });
    }
    return this.nodeIds.get(key);
  }

  endpointNode(controllerClass, endpoints, actionMethod) {
    const key = `EP:${controllerClass}:${actionMethod || ""}`;
    if (!this.nodeIds.has(key)) {
      const id = "EP_" + sanitizeId(controllerClass + (actionMethod || ""));
      this.nodeIds.set(key, id);
      const methods = [...new Set(endpoints.map((e) => e.httpMethod))].join("/");
      const label = actionMethod ? `${controllerClass}.${actionMethod}` : controllerClass;
      this.lines.push(`  ${id}[["${wrapLabel(label)}<br/>(${methods})"]]`);
      this.nodeMeta.set(id, { kind: "endpoint", label: `${label} (${methods})` });
      this.nodeOwnerModule.set(id, this.moduleNode(endpoints[0].module));
    }
    return this.nodeIds.get(key);
  }

  addEdge(from, to, label) {
    const key = `${from}->${to}->${label || ""}`;
    if (this.edgesSeen.has(key)) return;
    this.edgesSeen.add(key);
    this.lines.push(`  ${from} -->|${wrapLabel(label) || ""}| ${to}`);
    this.edgeList.push({ from, to, label: label || "" });
  }

  // --- Event side ---

  // `viaProducer` (set only when reached by following a chain, not when
  // this is the trace's own seed) restricts the drawn producer edge to the
  // one class that actually led here - mirrors visitRequest's `viaCaller`
  // below. Without it, a shared/generic event (e.g. one used as a common
  // "send this notification" trigger) would show EVERY known producer of
  // that event name on every trace that reaches it, including producers
  // that belong to completely unrelated features and have no causal link
  // to the flow being followed - exactly the kind of fan-in noise
  // viaCaller was already built to prevent on the request/command side.
  visitEvent(eventName, hopsLeft, viaProducer = null) {
    if (this.visitedEvents.has(eventName)) return;
    this.visitedEvents.add(eventName);
    const node = this.eventsByName.get(eventName);
    if (!node) return;
    const evtId = this.eventNode(eventName, node.label);

    if (viaProducer) {
      this.addEdge(viaProducer.fromNodeId || this.moduleNode(viaProducer.module), evtId, viaProducer.label);
    } else {
      for (const p of node.producers) {
        this.addEdge(this.moduleNode(p.module), evtId, p.publisherClass);
      }
    }
    for (const c of node.consumers) {
      this.addEdge(evtId, this.moduleNode(c.module), c.handlerClass);
    }
    if (!this.nodeOwnerModule.has(evtId)) {
      const owner = node.producers[0]?.module || node.consumers[0]?.module;
      if (owner) this.nodeOwnerModule.set(evtId, this.moduleNode(owner));
    }

    if (hopsLeft <= 0) return;
    for (const c of node.consumers) {
      if (!c.handlerClass) continue;
      this.followFromClass(c.handlerClass, c.module, hopsLeft - 1);
    }
  }

  // --- Command/query side ---

  // `viaCaller` (set only when reached by following a chain, not when this
  // is the trace's own seed) restricts the drawn edge to the one class that
  // actually led here. A command/query can be called from many unrelated
  // features (e.g. CreateContactCommand is shared across booking, sales,
  // core CRUD) - showing every global caller on every trace would pull in
  // modules that have nothing to do with the flow being followed. At the
  // seed itself, showing all known callers is the useful "who else calls
  // this" view instead.
  visitRequest(requestType, hopsLeft, viaCaller = null) {
    if (this.visitedRequests.has(requestType)) return;
    this.visitedRequests.add(requestType);
    const node = this.requestsByType.get(requestType);
    if (!node) return;
    const reqId = this.requestNode(requestType, node.label, node.kind);

    if (viaCaller) {
      this.addEdge(viaCaller.fromNodeId || this.moduleNode(viaCaller.module), reqId, viaCaller.label);
    } else {
      for (const caller of node.callers) {
        this.addEdge(this.moduleNode(caller.module), reqId, caller.callerClass);
      }
    }
    if (node.handler) {
      this.addEdge(reqId, this.moduleNode(node.handler.module), node.handler.handlerClass);
    }
    if (!this.nodeOwnerModule.has(reqId)) {
      const owner = node.handler?.module || node.callers[0]?.module;
      if (owner) this.nodeOwnerModule.set(reqId, this.moduleNode(owner));
    }

    if (hopsLeft <= 0 || !node.handler) return;
    this.followFromClass(node.handler.handlerClass, node.handler.module, hopsLeft - 1);
  }

  visitController(controllerClass, hopsLeft, actionMethod = null) {
    const visitKey = `${controllerClass}::${actionMethod || ""}`;
    if (this.visitedControllers.has(visitKey)) return;
    this.visitedControllers.add(visitKey);
    const allEndpoints = this.endpointsByController.get(controllerClass) || [];
    const endpoints = actionMethod ? allEndpoints.filter((e) => e.actionMethod === actionMethod) : allEndpoints;
    if (endpoints.length === 0) return;
    const epId = this.endpointNode(controllerClass, endpoints, actionMethod);
    this.moduleNode(endpoints[0].module);

    if (hopsLeft <= 0) return;
    this.followFromClass(controllerClass, endpoints[0].module, hopsLeft, epId, actionMethod);
  }

  // A class can (a) publish further events and (b) dispatch further
  // commands/queries - follow both. `fromNodeId` lets a controller's own
  // node be the edge source; otherwise classes are matched by name only
  // (their own producer/consumer edges already drew the module boxes).
  // `actionMethod` (only meaningful for a controller seed - handler classes
  // don't have multiple named actions) additionally restricts matching
  // dispatches to the ones inside that specific action's body, so a
  // multi-action controller's actions don't bleed into each other's trace.
  // A call site is recorded against whichever class's source textually
  // contains it - so a subclass that only invokes an *inherited* method
  // (e.g. a provisioning handler that publishes an event solely via a
  // shared base class's own method) never itself shows up as the caller/
  // publisher, only its base class does. Treating className's full
  // ancestor chain as equivalent to className lets the trace continue
  // through that base class's own edges instead of dead-ending here.
  // recordedModule/recordedClass are what a Publish/CapSubscribe/dispatch
  // call site was actually attributed to; className/module are the class
  // currently being followed. An exact class match must still agree on
  // module (that's just the same edge). An ancestor match (className's
  // subclass invoking an inherited base-class method) does NOT require
  // module agreement - the base class legitimately lives in whatever
  // module it was declared in (e.g. a shared BaseModuleProvisioningService
  // in SharedKernel, called from a per-module subclass in Backend/ProductData
  // or any other module) - trust the recorded module for that edge instead
  // of the subclass's own.
  matchesRecordedEdge(recordedClass, recordedModule, className, module) {
    if (recordedClass === className) return recordedModule === module;
    return ancestorsOf(className, this.classHierarchy).has(recordedClass);
  }

  followFromClass(className, module, hopsLeft, fromNodeId, actionMethod = null) {
    // An endpoint node's own label already IS the controller class name
    // (e.g. "PublicBookingController.CreateBooking (POST)") - repeating it
    // as the edge's label too is pure duplication, unlike every other
    // fromNodeId (a request/event box, whose label is its own business
    // name, not the dispatching class), where the label is the only place
    // that class name appears at all.
    const edgeLabel = fromNodeId && this.nodeMeta.get(fromNodeId)?.kind === "endpoint" ? "" : className;
    for (const [reqType, req] of this.requestsByType) {
      const calledHere = req.callers.some(
        (c) =>
          this.matchesRecordedEdge(c.callerClass, c.module, className, module) &&
          (actionMethod === null || c.actionMethod === actionMethod),
      );
      if (!calledHere) continue;
      if (fromNodeId) {
        const reqId = this.requestNode(reqType, req.label, req.kind);
        this.addEdge(fromNodeId, reqId, edgeLabel);
      }
      this.visitRequest(reqType, hopsLeft - 1, { label: edgeLabel, module, fromNodeId });
    }
    for (const [eventName, evt] of this.eventsByName) {
      const publishedHere = evt.producers.some((p) => this.matchesRecordedEdge(p.publisherClass, p.module, className, module));
      if (!publishedHere) continue;
      if (fromNodeId) {
        const evtId = this.eventNode(eventName, evt.label);
        this.addEdge(fromNodeId, evtId, edgeLabel);
      }
      this.visitEvent(eventName, hopsLeft - 1, { label: edgeLabel, module, fromNodeId });
    }
  }

  toString() {
    return this.lines.join("\n");
  }
}

function main() {
  const [, , eventsPath, commandsPath, seed, ...rest] = process.argv;
  if (!eventsPath || !commandsPath || !seed) {
    console.error(
      "Usage: node generate-flow-diagram.mjs <events.json> <commands.json> <seed> [--kind event|request|controller] [--hops N]",
    );
    process.exit(1);
  }
  const hopsIdx = rest.indexOf("--hops");
  const maxHops = hopsIdx !== -1 ? Number.parseInt(rest[hopsIdx + 1], 10) : 4;
  const kindIdx = rest.indexOf("--kind");
  let kind = kindIdx !== -1 ? rest[kindIdx + 1] : null;
  const actionIdx = rest.indexOf("--action");
  const actionMethod = actionIdx !== -1 ? rest[actionIdx + 1] : null;

  const eventsGraph = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
  const commandsGraph = JSON.parse(fs.readFileSync(commandsPath, "utf-8"));

  const eventsByName = new Map(eventsGraph.map((n) => [n.eventName, n]));
  const requestsByType = new Map(commandsGraph.requests.map((r) => [r.requestType, r]));
  const endpointsByController = new Map();
  for (const ep of commandsGraph.endpoints) {
    if (!endpointsByController.has(ep.controllerClass)) {
      endpointsByController.set(ep.controllerClass, []);
    }
    endpointsByController.get(ep.controllerClass).push(ep);
  }

  if (!kind) {
    if (eventsByName.has(seed)) kind = "event";
    else if (requestsByType.has(seed)) kind = "request";
    else if (endpointsByController.has(seed)) kind = "controller";
    else {
      console.error(`Could not find "${seed}" as an event, request type, or controller class.`);
      process.exit(1);
    }
  }

  const builder = new DiagramBuilder(eventsByName, requestsByType, endpointsByController);
  if (kind === "event") builder.visitEvent(seed, maxHops);
  else if (kind === "request") builder.visitRequest(seed, maxHops);
  else if (kind === "controller") builder.visitController(seed, maxHops, actionMethod);
  else {
    console.error(`Unknown --kind: ${kind}`);
    process.exit(1);
  }

  console.log(builder.toString());
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
