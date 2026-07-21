#!/usr/bin/env node
// Finds which Angular components/services call which NSwag-generated backend
// API client methods - the frontend -> backend edge of the picture. Combined
// with extract-gateway-routes.mjs (upstream path -> downstream service) and
// extract-command-graph.mjs (controller -> command/query -> handler), this
// closes the loop: Angular component -> generated client method -> HTTP call
// -> gateway route -> backend controller -> ... (the existing event/command
// graphs pick up from there).
//
// Client method -> backend controller action is NOT resolved here (would
// need matching the generated client's internal URL template against
// controller routes) - this only extracts "this Angular file calls this
// client's this method", which is already the missing half.
//
// Output: JSON array to stdout (or --out <file>).

import fs from "fs";
import path from "path";

const ANGULAR_ROOT = "/Users/michael/Projects/Processity.WebApp.Angular/src";
const CLIENTS_DIR = path.join(ANGULAR_ROOT, "shared/services/api/clients");

function walkTsFiles(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) out.push(full);
  }
}

function parseClientFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const classMatch = /export class (\w+) implements (\w+)/.exec(content);
  if (!classMatch) return null;
  const [, className, interfaceName] = classMatch;

  const ifaceStart = content.indexOf(`export interface ${interfaceName}`);
  if (ifaceStart === -1) return null;
  const braceStart = content.indexOf("{", ifaceStart);
  let depth = 1;
  let i = braceStart + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") depth--;
    i++;
  }
  const ifaceBody = content.slice(braceStart + 1, i - 1);

  const methodNames = new Set();
  const methodRe = /^\s*(\w+)\(/gm;
  let m;
  while ((m = methodRe.exec(ifaceBody))) {
    methodNames.add(m[1]);
  }

  return { className, methodNames: [...methodNames], file: path.relative(ANGULAR_ROOT, filePath) };
}

function main() {
  const clientFiles = fs
    .readdirSync(CLIENTS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(CLIENTS_DIR, f));

  const clients = clientFiles.map(parseClientFile).filter(Boolean);
  console.error(`Parsed ${clients.length} API client classes.`);

  const allFiles = [];
  walkTsFiles(ANGULAR_ROOT, allFiles);
  const nonClientFiles = allFiles.filter((f) => !f.startsWith(CLIENTS_DIR));
  console.error(`Scanning ${nonClientFiles.length} non-client .ts files for usage...`);

  const calls = [];
  for (const file of nonClientFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const relFile = path.relative(ANGULAR_ROOT, file);

    for (const client of clients) {
      if (!content.includes(client.className)) continue;
      for (const methodName of client.methodNames) {
        const callRe = new RegExp(`\\.${methodName}\\(`, "g");
        if (callRe.test(content)) {
          calls.push({ file: relFile, clientClassName: client.className, methodName });
        }
      }
    }
  }

  const output = JSON.stringify(calls, null, 2);
  const outIdx = process.argv.indexOf("--out");
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    fs.writeFileSync(process.argv[outIdx + 1], output);
    console.error(`Wrote ${calls.length} call sites to ${process.argv[outIdx + 1]}`);
  } else {
    process.stdout.write(output);
  }

  const uniqueFiles = new Set(calls.map((c) => c.file)).size;
  console.error(`Call sites: ${calls.length} across ${uniqueFiles} frontend files.`);
}

main();
