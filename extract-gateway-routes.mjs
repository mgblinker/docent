#!/usr/bin/env node
// Parses Ocelot's own routing config (plain JSON, no regex needed) to build
// the "upstream path -> which backend service" table for the ApiGateway.
// This is the cross-service HTTP layer that extract-command-graph.mjs can't
// see (it only knows about controllers inside a single repo's process).
//
// Uses the "local" docker-compose environment's config as representative -
// route topology (which upstream path maps to which service) is identical
// across environments; only hostnames/ports differ.
//
// Output: JSON array to stdout (or --out <file>).

import fs from "fs";
import path from "path";

const CONFIG_DIR = "/Users/michael/Projects/Processity.ApiGateway/.docker/local/config";

function serviceNameFromHost(host) {
  // "processity-calendar-service-local" -> "Calendar"
  return host
    .replace(/^processity-/, "")
    .replace(/-service.*$/, "")
    .replace(/-local$|-dev$|-uat$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function buildGatewayRoutes() {
  const files = fs
    .readdirSync(CONFIG_DIR)
    .filter((f) => f.startsWith("ocelot.") && f.endsWith(".json") && f !== "ocelot.global.json");

  const routes = [];
  for (const file of files) {
    const configKey = file.replace(/^ocelot\./, "").replace(/\.json$/, "");
    const parsed = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, file), "utf-8"));
    for (const route of parsed.Routes || []) {
      const host = route.DownstreamHostAndPorts?.[0]?.Host;
      routes.push({
        configKey,
        swaggerKey: route.SwaggerKey || null,
        upstreamPathTemplate: route.UpstreamPathTemplate,
        upstreamHttpMethods: route.UpstreamHttpMethod || [],
        downstreamPathTemplate: route.DownstreamPathTemplate,
        downstreamService: host ? serviceNameFromHost(host) : null,
        downstreamHost: host || null,
      });
    }
  }

  routes.sort((a, b) => a.upstreamPathTemplate.localeCompare(b.upstreamPathTemplate));
  return routes;
}

// Matches a backend endpoint's own route (e.g. "api/communications/v1.0/x")
// against Ocelot's wildcard passthrough routes (downstreamPathTemplate
// ending in "{everything}") by plain path-prefix substitution - this works
// regardless of which physical host serves the route, since the Backend
// modular monolith's modules all share one host and are only distinguished
// by path prefix, not by DownstreamHostAndPorts.
export function resolvePublicUrl(routes, downstreamFullPath, httpMethod) {
  const normalized = downstreamFullPath.startsWith("/") ? downstreamFullPath : "/" + downstreamFullPath;
  let best = null;
  for (const route of routes) {
    if (!route.downstreamPathTemplate.endsWith("{everything}")) continue;
    if (httpMethod && route.upstreamHttpMethods.length > 0 && !route.upstreamHttpMethods.includes(httpMethod)) {
      continue;
    }
    const downstreamPrefix = route.downstreamPathTemplate.slice(0, -"{everything}".length);
    if (!normalized.startsWith(downstreamPrefix)) continue;
    // Several routes can match the same path (e.g. authentication's generic
    // "/api/{everything}" catch-all vs calendar's specific "/api/calendar/
    // {everything}") - the most specific (longest) prefix wins, same as a
    // real reverse proxy would resolve it.
    if (!best || downstreamPrefix.length > best.downstreamPrefix.length) {
      best = { route, downstreamPrefix };
    }
  }
  if (!best) return null;
  const upstreamPrefix = best.route.upstreamPathTemplate.slice(0, -"{everything}".length);
  return upstreamPrefix + normalized.slice(best.downstreamPrefix.length);
}

function main() {
  const routes = buildGatewayRoutes();
  const fileCount = new Set(routes.map((r) => r.configKey)).size;

  const output = JSON.stringify(routes, null, 2);
  const outIdx = process.argv.indexOf("--out");
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    fs.writeFileSync(process.argv[outIdx + 1], output);
    console.error(`Wrote ${routes.length} routes from ${fileCount} config files to ${process.argv[outIdx + 1]}`);
  } else {
    process.stdout.write(output);
  }

  const byService = new Map();
  for (const r of routes) {
    byService.set(r.downstreamService, (byService.get(r.downstreamService) || 0) + 1);
  }
  console.error(`Routes: ${routes.length} across ${byService.size} downstream services.`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
