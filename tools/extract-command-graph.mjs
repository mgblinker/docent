#!/usr/bin/env node
// Static analyzer: builds a cross-repo synchronous-dispatch graph (CQRS
// commands/queries + the HTTP controller endpoints that trigger them) from
// C# source, without running any code. Complements extract-event-graph.mjs,
// which only covers the async CAP event-bus side - controllers and
// mediator.Send(...) calls are the dominant *synchronous* trigger mechanism
// in this modular monolith and were entirely missing from that graph.
//
// Dispatch call sites (mediator.Send(...)) are attributed to the specific
// action *method* they're inside (via findFollowingMethod's body-span
// matching), not just the enclosing controller class - a controller with
// several actions gets each action's dispatch(es) attributed independently.
//
// Output: JSON to stdout (or --out <file>): { requests: [...], endpoints: [...] }

import fs from "node:fs";
import path from "node:path";
import {
  PROJECTS_ROOT,
  REPO_NAMES,
  walkAllRepos,
  moduleFromPath,
  stripComments,
  findTypeDeclarations,
  enclosingTypeName,
  extractBalancedAttrArgs,
  humanizeTypeName,
  findFollowingMethod,
  methodNameAt,
} from "./lib/cs-scan.mjs";

const HTTP_VERBS = [
  "HttpGet",
  "HttpPost",
  "HttpPut",
  "HttpDelete",
  "HttpPatch",
];

function findVariableAssignedType(content, varName, beforeIndex) {
  const re = new RegExp(
    String.raw`\b${varName}\s*=\s*new\s+([A-Za-z][A-Za-z0-9_]*)\s*\(`,
    "g",
  );
  let lastMatch = null;
  let m;
  while ((m = re.exec(content))) {
    if (m.index >= beforeIndex) break;
    lastMatch = m;
  }
  return lastMatch ? lastMatch[1] : null;
}

function findClassForAttribute(decls, attrStart) {
  for (const d of decls) {
    if (d.offset > attrStart) {
      return d.name;
    }
  }
  return null;
}

function parseHandlers(content, decls, state, module, relFile) {
  const handlerRe = /IRequestHandler<\s*([A-Za-z]\w*)/g;
  let m;
  while ((m = handlerRe.exec(content))) {
    const requestType = m[1];
    const handlerClass = enclosingTypeName(decls, m.index);
    if (!handlerClass) continue;
    if (!state.handlers.has(requestType)) {
      state.handlers.set(requestType, { handlerClass, module, file: relFile });
    }
  }
}

function parseControllerRoutes(content, decls, state) {
  const routeRe = /\[Route\(/g;
  let m;
  while ((m = routeRe.exec(content))) {
    const argsStart = m.index + m[0].length;
    const args = extractBalancedAttrArgs(content, argsStart);
    const routeMatch = /^\s*"([^"]+)"/.exec(args);
    if (!routeMatch) continue;
    const className = findClassForAttribute(decls, argsStart);
    if (className) {
      state.controllerRoutes.set(className, routeMatch[1]);
    }
  }
}

function parseHttpEndpoints(content, decls, state, module, relFile) {
  const httpRe = new RegExp(
    String.raw`\[(${HTTP_VERBS.join("|")})(?:\(([^)]*)\))?\]`,
    "g",
  );
  const actionSpans = [];
  let m;
  while ((m = httpRe.exec(content))) {
    const httpMethod = m[1].replace("Http", "").toUpperCase();
    const segmentMatch = m[2] ? /"([^"]+)"/.exec(m[2]) : null;
    const controllerClass = enclosingTypeName(decls, m.index);
    if (!controllerClass) continue;
    const methodInfo = findFollowingMethod(content, m.index + m[0].length);
    if (methodInfo) actionSpans.push(methodInfo);
    state.endpoints.push({
      module,
      controllerClass,
      actionMethod: methodInfo ? methodInfo.methodName : null,
      httpMethod,
      routeSegment: segmentMatch ? segmentMatch[1] : null,
      file: relFile,
    });
  }
  return actionSpans;
}

function parseDispatches(content, decls, actionSpans, state, module, relFile) {
  const sendInlineRe = /mediator\.Send\(\s*new\s+([A-Za-z]\w*)\s*\(/g;
  const sendVarRe = /mediator\.Send\(\s*([A-Za-z_]\w*)\s*[,)]/g;

  function recordDispatch(index, requestType) {
    const callerClass = enclosingTypeName(decls, index);
    if (!requestType || !callerClass) return;
    const actionMethod = methodNameAt(actionSpans, index);
    state.dispatches.push({
      requestType,
      module,
      callerClass,
      actionMethod,
      file: relFile,
    });
  }

  let m;
  while ((m = sendInlineRe.exec(content))) {
    recordDispatch(m.index, m[1]);
  }
  while ((m = sendVarRe.exec(content))) {
    recordDispatch(m.index, findVariableAssignedType(content, m[1], m.index));
  }
}

function parseFile(filePath, state) {
  const content = fs.readFileSync(filePath, "utf-8");
  const module = moduleFromPath(filePath);
  const decls = findTypeDeclarations(stripComments(content));
  const relFile = path.relative(PROJECTS_ROOT, filePath);

  parseHandlers(content, decls, state, module, relFile);
  parseControllerRoutes(content, decls, state);
  const actionSpans = parseHttpEndpoints(
    content,
    decls,
    state,
    module,
    relFile,
  );
  parseDispatches(content, decls, actionSpans, state, module, relFile);
}

function classifyRequestKind(requestType) {
  if (requestType.endsWith("Command")) return "command";
  if (requestType.endsWith("Query")) return "query";
  return "unknown";
}

export function buildCommandGraph() {
  const state = {
    handlers: new Map(), // requestType -> { handlerClass, module, file }
    controllerRoutes: new Map(), // controllerClass -> route template
    endpoints: [], // { module, controllerClass, httpMethod, routeSegment, file }
    dispatches: [], // { requestType, module, callerClass, file }
  };

  const files = walkAllRepos();

  for (const file of files) {
    parseFile(file, state);
  }

  const requestTypes = new Set([
    ...state.handlers.keys(),
    ...state.dispatches.map((d) => d.requestType),
  ]);

  const requests = [...requestTypes]
    .map((requestType) => {
      const handler = state.handlers.get(requestType) || null;
      const callers = state.dispatches
        .filter((d) => d.requestType === requestType)
        .map((d) => ({
          module: d.module,
          callerClass: d.callerClass,
          actionMethod: d.actionMethod,
          file: d.file,
        }));
      return {
        requestType,
        label: humanizeTypeName(requestType),
        kind: classifyRequestKind(requestType),
        handler,
        callers,
      };
    })
    .filter((r) => r.handler || r.callers.length > 0)
    .sort((a, b) => a.requestType.localeCompare(b.requestType));

  const endpoints = state.endpoints
    .map((e) => ({
      ...e,
      routeTemplate: state.controllerRoutes.get(e.controllerClass) || null,
    }))
    .sort((a, b) => a.controllerClass.localeCompare(b.controllerClass));

  return { requests, endpoints };
}

function main() {
  console.error(`Scanning .cs files across ${REPO_NAMES.length} repos...`);
  const { requests, endpoints } = buildCommandGraph();

  const output = JSON.stringify({ requests, endpoints }, null, 2);
  const outIdx = process.argv.indexOf("--out");
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    fs.writeFileSync(process.argv[outIdx + 1], output);
    console.error(
      `Wrote ${requests.length} requests, ${endpoints.length} endpoints to ${process.argv[outIdx + 1]}`,
    );
  } else {
    process.stdout.write(output);
  }

  const withHandler = requests.filter((r) => r.handler).length;
  const withCallers = requests.filter((r) => r.callers.length > 0).length;
  console.error(
    `Requests: ${requests.length} (${withHandler} with a resolved handler, ${withCallers} with at least one caller). Endpoints: ${endpoints.length}.`,
  );
}

const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
