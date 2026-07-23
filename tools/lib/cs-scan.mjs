// Shared C# static-analysis helpers used by extract-event-graph.mjs and
// extract-command-graph.mjs. Regex/heuristic based on purpose - this is a
// docs-generation tool, not a compiler; it optimizes for "mostly right,
// cheap to run across 5000+ files" over full correctness.

import fs from "fs";
import path from "path";
import { loadConfig } from "./config.mjs";

const config = loadConfig();
export const PROJECTS_ROOT = config.projectsRoot;
export const REPO_NAMES = config.repoNames;
const MONOLITH_REPO = config.monolithRepoName || null;

// Repo names conventionally look like "YourOrg.Backend" - strip whatever
// comes before the first dot rather than hardcoding an org name, so this
// works unchanged for any org's naming.
function shortRepoName(repo) {
  const dot = repo.indexOf(".");
  return dot === -1 ? repo : repo.slice(dot + 1);
}

export function walkCsFiles(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (
      entry.name === "bin" ||
      entry.name === "obj" ||
      entry.name === "node_modules" ||
      entry.name.startsWith(".") ||
      /(?:^|[.\-_])tests?$/i.test(entry.name)
    ) {
      continue;
    }
    if (entry.isFile() && /Tests?\.cs$/.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkCsFiles(full, out);
    } else if (entry.name.endsWith(".cs")) {
      out.push(full);
    }
  }
}

export function walkAllRepos() {
  const files = [];
  for (const repo of REPO_NAMES) {
    walkCsFiles(path.join(PROJECTS_ROOT, repo), files);
  }
  return files;
}

// Module identity from the file path: repo name, plus (for the modular
// monolith repo specifically, configured as monolithRepoName) the module
// folder right under it.
export function moduleFromPath(filePath) {
  const rel = path.relative(PROJECTS_ROOT, filePath);
  const segments = rel.split(path.sep);
  const repo = segments[0];
  if (MONOLITH_REPO && repo === MONOLITH_REPO && segments.length > 1) {
    return `${shortRepoName(repo)}/${segments[1]}`;
  }
  return shortRepoName(repo);
}

// Replaces comment text with spaces (same length, newlines kept) so that
// character offsets stay identical between the original and stripped
// versions of the file - stripping is only used to avoid words like "record"
// inside an XML doc comment being mistaken for a type declaration.
export function stripComments(content) {
  return content.replace(/\/\/\/.*|\/\/.*|\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, " "),
  );
}

const TYPE_DECL_RE =
  // Captures an optional generic param list, an optional primary-constructor
  // parameter list (this codebase's convention, per CLAUDE.md), and an
  // optional base/interface list after ":" - needed so a subclass calling an
  // inherited base-class method (e.g. a provisioning handler that publishes
  // an event only via a shared base class) can still be linked back to that
  // base class's own producer/consumer edges (see buildClassHierarchy below).
  /\b(?:public|internal|private)?\s*(?:sealed\s+)?(?:partial\s+)?(?:class|record|interface)\s+([A-Z][A-Za-z0-9_]*)(?:<[^>]*>)?\s*(?:\([^)]*\))?\s*(?::\s*([^{;\n]+))?/g;

// Splits a base/interface list on commas that aren't nested inside a
// generic's `<...>` (e.g. "ICommandHandler<Foo, Bar>, BaseThing" should
// split into ["ICommandHandler<Foo, Bar>", " BaseThing"], not on every
// comma) - a plain .split(",") would wrongly cut generic argument lists.
function splitTopLevelCommas(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "<") depth++;
    else if (ch === ">") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

export function findTypeDeclarations(strippedContent) {
  const decls = [];
  let m;
  TYPE_DECL_RE.lastIndex = 0;
  while ((m = TYPE_DECL_RE.exec(strippedContent))) {
    const baseListRaw = m[2] || "";
    // Each token's leading identifier only - drops generic args (a base
    // class is rarely itself generic in this codebase) and leading
    // whitespace. Interfaces end up in this list alongside any real base
    // class - harmless, since an interface never has its own producer/
    // consumer edges to match against, it just yields no extra hits.
    const baseClasses = splitTopLevelCommas(baseListRaw)
      .map((t) => /^\s*([A-Z][A-Za-z0-9_]*)/.exec(t)?.[1])
      .filter(Boolean);
    decls.push({ offset: m.index, name: m[1], baseClasses });
  }
  return decls;
}

// className -> array of directly-declared base classes/interfaces, built
// once across every repo. Lets callers resolve "is this class (or any of
// its ancestors) the one that actually publishes/consumes X" - needed
// because a subclass invoking an inherited base-class method never itself
// appears as the enclosing type at a Publish/CapSubscribe call site.
export function buildClassHierarchy() {
  const hierarchy = new Map();
  for (const file of walkAllRepos()) {
    let content;
    try {
      content = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    for (const decl of findTypeDeclarations(stripComments(content))) {
      if (!hierarchy.has(decl.name) && decl.baseClasses.length > 0) {
        hierarchy.set(decl.name, decl.baseClasses);
      }
    }
  }
  return hierarchy;
}

// Every class/interface name reachable by walking up className's base list,
// transitively (depth-capped, cycle-safe - inheritance chains in practice
// never run deep enough for the cap to matter).
export function ancestorsOf(className, hierarchy, maxDepth = 8) {
  const seen = new Set();
  const queue = [{ name: className, depth: 0 }];
  while (queue.length > 0) {
    const { name, depth } = queue.shift();
    if (depth >= maxDepth) continue;
    const bases = hierarchy.get(name);
    if (!bases) continue;
    for (const base of bases) {
      if (seen.has(base)) continue;
      seen.add(base);
      queue.push({ name: base, depth: depth + 1 });
    }
  }
  return seen;
}

export function enclosingTypeName(decls, index) {
  let name = null;
  for (const d of decls) {
    if (d.offset <= index) name = d.name;
    else break;
  }
  return name;
}

export function nextTypeName(decls, index) {
  for (const d of decls) {
    if (d.offset > index) return d.name;
  }
  return null;
}

export function extractBalancedAttrArgs(content, startIdx) {
  // startIdx points at the char right after "[SomeAttribute(" - i.e. the "("
  let depth = 1;
  let i = startIdx;
  while (i < content.length && depth > 0) {
    if (content[i] === "(") depth++;
    else if (content[i] === ")") depth--;
    i++;
  }
  return content.slice(startIdx, i - 1);
}

// Turns "GetUserAvailabilityQuery" into "Get User Availability" (drops the
// Command/Query/Handler suffix, splits PascalCase) for a readable label
// when there's no human-authored one available.
export function humanizeTypeName(typeName) {
  const stripped = typeName.replace(/(Command|Query|Handler)$/, "");
  return stripped.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

// Turns "GetAvailableSlotsAsync" into "Get Available Slots" - same idea as
// humanizeTypeName but for method names (strips the async suffix instead of
// Command/Query/Handler).
export function humanizeIdentifier(name) {
  const stripped = name.replace(/Async$/, "");
  return stripped.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

// Skips over zero or more `[Attribute(...)]` blocks starting at `pos`
// (whitespace-tolerant), returning the index right after the last one.
function skipAttributeBlocks(content, pos) {
  let i = pos;
  while (true) {
    while (i < content.length && /\s/.test(content[i])) i++;
    if (content[i] !== "[") break;
    let depth = 1;
    i++;
    while (i < content.length && depth > 0) {
      if (content[i] === "[") depth++;
      else if (content[i] === "]") depth--;
      i++;
    }
  }
  return i;
}

// Given the index right after an attribute (e.g. right after "[HttpGet]"),
// finds the method it decorates: name, and its body's [start, end) span
// (brace-matched) so call sites can later be attributed to the specific
// method they're in, not just the enclosing class. Deliberately doesn't try
// to parse the return type (arbitrarily-nested generics like
// Task<Result<List<X>>> aren't worth a real parser for this) - skips
// remaining attribute blocks, then the first `identifier(` found is the
// method's own parameter list, since nothing else with parens can legally
// appear between the last attribute and the method signature.
export function findFollowingMethod(content, attrEndIdx) {
  const afterAttrs = skipAttributeBlocks(content, attrEndIdx);
  const rest = content.slice(afterAttrs, afterAttrs + 2000);
  const m = /([A-Za-z_]\w*)\s*\(/.exec(rest);
  if (!m) return null;
  const methodName = m[1];
  let i = afterAttrs + m.index + m[0].length; // just after the "("
  let depth = 1;
  while (i < content.length && depth > 0) {
    if (content[i] === "(") depth++;
    else if (content[i] === ")") depth--;
    i++;
  }
  while (i < content.length && content[i] !== "{" && content[i] !== ";") i++;
  if (content[i] !== "{") return { methodName, bodyStart: null, bodyEnd: null };
  const bodyStart = i + 1;
  let bd = 1;
  let k = bodyStart;
  while (k < content.length && bd > 0) {
    if (content[k] === "{") bd++;
    else if (content[k] === "}") bd--;
    k++;
  }
  return { methodName, bodyStart, bodyEnd: k - 1 };
}

export function methodNameAt(methodSpans, index) {
  for (const span of methodSpans) {
    if (span.bodyStart !== null && index >= span.bodyStart && index < span.bodyEnd) {
      return span.methodName;
    }
  }
  return null;
}
