import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import fg from "fast-glob";

export interface NavNode {
  title: string;
  path: string;
  file?: string;
  children?: NavNode[];
  category?: string;
  docType?: string;
}

// "feature"/"howto" are legacy frontmatter values from before those buckets
// were merged into "manual" (Manuals and HowTos) - normalize here so the
// nav tree's docType field matches the tab filter's id, keeping this in
// sync with the identical alias in src/components/content.ts.
const TYPE_ALIASES: Record<string, string> = { feature: "manual", howto: "manual" };

export interface DocTypeConfig {
  id: string;
  label: string;
  patterns: string[];
}

export interface ScanOptions {
  exclude: string[];
  navExcludeFiles: string[];
  transparentFolders: string[];
  docTypes: DocTypeConfig[];
}

interface NavYml {
  title?: string;
  nav?: NavEntry[];
}

type NavEntry = string | Record<string, NavEntry[] | string>;

const NAV_FILES = ["_nav.yml", ".pages"];

function toTitleCase(text: string): string {
  return text
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b[A-Z]{2,}\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase())
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/i, "");
  if (base.toLowerCase() === "readme") return "";
  return toTitleCase(base) || filename;
}

function isGenericTitle(title: string): boolean {
  const stripped = title.replace(/[^a-z]/gi, "").toLowerCase();
  return stripped === "readme" || stripped === "readmemd";
}

function titleFromSlug(slug: string): string {
  return toTitleCase(slug).replace(/\b(Api|Ui|Cicd|Ocr|Pdf)\b/g, (m) =>
    m.toUpperCase(),
  );
}

function joinRelative(base: string, segment: string): string {
  return base ? `${base}/${segment}` : segment;
}

function isExcluded(relPath: string, patterns: string[]): boolean {
  return patterns.some((p) => matchGlob(relPath, p));
}

function matchGlob(filePath: string, pattern: string): boolean {
  const regex = pattern
    .replaceAll("**", "{{DOUBLESTAR}}")
    .replaceAll("*", "[^/]*")
    .replaceAll("{{DOUBLESTAR}}", ".*")
    .replaceAll("?", "[^/]");
  return (
    new RegExp(`^${regex}$`).test(filePath) ||
    new RegExp(`(^|/)${regex}($|/)`).test(filePath)
  );
}

function normalizeTitle(title: string): string {
  const stripped = title.replace(/[-_]/g, " ").trim();
  const isAllUpper = /^[^a-z]*$/.test(stripped) && /[A-Z]/.test(stripped);
  const isAllLower = /^[^A-Z]*$/.test(stripped) && /[a-z]/.test(stripped);
  if (isAllUpper || isAllLower) {
    return stripped
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return stripped;
}

interface FileMeta {
  title: string | null;
  docType: string | null;
}

async function extractFileMeta(filePath: string): Promise<FileMeta> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    let docType: string | null = null;

    const fmMatch = /^---\n([\s\S]*?)\n---/.exec(content);
    if (fmMatch) {
      const fm = yaml.load(fmMatch[1]) as Record<string, unknown>;
      if (typeof fm?.type === "string") docType = TYPE_ALIASES[fm.type] || fm.type;
    }

    const titleMatch = /^#\s+(.+)$/m.exec(content);
    const title = titleMatch ? normalizeTitle(titleMatch[1]) : null;

    return { title, docType };
  } catch {
    return { title: null, docType: null };
  }
}

function inferDocType(relPath: string, opts: ScanOptions): string | null {
  const lower = relPath.toLowerCase();
  for (const dt of opts.docTypes) {
    for (const pattern of dt.patterns) {
      if (matchGlob(lower, pattern.toLowerCase())) return dt.id;
    }
  }
  return null;
}

async function dirHasMarkdown(dirPath: string): Promise<boolean> {
  try {
    const entries = await fg("**/*.md", {
      cwd: dirPath,
      onlyFiles: true,
      deep: 10,
    });
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function readNavYml(dirPath: string): Promise<NavYml | null> {
  for (const navFile of NAV_FILES) {
    try {
      const raw = await fs.readFile(path.join(dirPath, navFile), "utf-8");
      const parsed = yaml.load(raw);
      if (Array.isArray(parsed)) return { nav: parsed };
      if (parsed && typeof parsed === "object") return parsed as NavYml;
    } catch {
      // try next
    }
  }
  return null;
}

async function readDirTitle(
  dirPath: string,
  fallback: string,
): Promise<string> {
  const navYml = await readNavYml(dirPath);
  return navYml?.title && typeof navYml.title === "string"
    ? navYml.title
    : fallback;
}

function stripSlugPrefix(filePath: string, relativePath: string): string {
  const slug = relativePath.split("/").pop() || "";
  if (slug && filePath.startsWith(`${slug}/`)) {
    return filePath.slice(slug.length + 1);
  }
  return filePath;
}

function isNavExcluded(relFile: string, opts: ScanOptions): boolean {
  const base = relFile.split("/").pop() || relFile;
  return opts.navExcludeFiles.some((pattern) => {
    if (!pattern.includes("/") && !pattern.includes("*")) {
      return base === pattern;
    }
    return matchGlob(relFile.toLowerCase(), pattern.toLowerCase());
  });
}

function isTransparent(dirname: string, opts: ScanOptions): boolean {
  return opts.transparentFolders.includes(dirname);
}

async function processFileEntry(
  filename: string,
  dirPath: string,
  relativePath: string,
  opts: ScanOptions,
): Promise<NavNode | null> {
  const cleaned = stripSlugPrefix(filename, relativePath);
  const relFile = joinRelative(relativePath, cleaned);
  if (isNavExcluded(relFile, opts)) return null;
  if (isExcluded(relFile, opts.exclude)) return null;
  try {
    await fs.access(path.join(dirPath, cleaned));
  } catch {
    return null;
  }
  const meta = await extractFileMeta(path.join(dirPath, cleaned));
  let title = meta.title || titleFromFilename(cleaned);
  if (!title || isGenericTitle(title)) {
    title = toTitleCase(path.basename(dirPath));
  }
  if (!title) return null;
  const docType = meta.docType || inferDocType(relFile, opts);
  return { title, path: relFile, file: relFile, ...(docType && { docType }) };
}

async function processDirEntry(
  dirname: string,
  dirPath: string,
  relativePath: string,
  opts: ScanOptions,
): Promise<NavNode | NavNode[] | null> {
  const subDirPath = path.join(dirPath, dirname);
  const subRelPath = joinRelative(relativePath, dirname);
  if (isExcluded(subRelPath, opts.exclude)) return null;
  try {
    await fs.access(subDirPath);
  } catch {
    return null;
  }
  if (!(await dirHasMarkdown(subDirPath))) return null;
  const children = await scanDir(subDirPath, subRelPath, opts);
  if (children.length === 0) return null;

  if (isTransparent(dirname, opts)) {
    return children;
  }

  const title = await readDirTitle(subDirPath, titleFromSlug(dirname));
  // index.md is always nav-excluded (it's the folder's own landing page, not
  // a sibling doc), so it never becomes a child node - without this, a
  // folder's index.md is unreachable through the UI entirely, since folder
  // labels otherwise only expand/collapse. Wiring it as the folder node's
  // own `file` lets the sidebar make the label itself clickable.
  let indexFile: string | undefined;
  try {
    await fs.access(path.join(subDirPath, "index.md"));
    indexFile = joinRelative(subRelPath, "index.md");
  } catch {
    /* no index.md for this folder */
  }
  return { title, path: subRelPath, children, ...(indexFile && { file: indexFile }) };
}

async function processObjectEntry(
  entry: Record<string, NavEntry[] | string>,
  dirPath: string,
  relativePath: string,
  opts: ScanOptions,
): Promise<NavNode[]> {
  const nodes: NavNode[] = [];
  for (const [key, value] of Object.entries(entry)) {
    if (typeof value === "string" && value.endsWith(".md")) {
      const cleaned = stripSlugPrefix(value, relativePath);
      const relFile = joinRelative(relativePath, cleaned);
      if (isNavExcluded(relFile, opts)) continue;
      if (isExcluded(relFile, opts.exclude)) continue;
      try {
        await fs.access(path.join(dirPath, cleaned));
      } catch {
        continue;
      }
      const meta = await extractFileMeta(path.join(dirPath, cleaned));
      const docType = meta.docType || inferDocType(relFile, opts);
      nodes.push({ title: normalizeTitle(key), path: relFile, file: relFile, ...(docType && { docType }) });
    } else if (Array.isArray(value)) {
      const children = await processNavEntries(
        value,
        dirPath,
        relativePath,
        opts,
      );
      if (children.length > 0) {
        nodes.push({
          title: key,
          path: `${relativePath}/__cat_${key}`,
          category: key,
          children,
        });
      }
    }
  }
  return nodes;
}

async function processNavEntries(
  entries: NavEntry[],
  dirPath: string,
  relativePath: string,
  opts: ScanOptions,
): Promise<NavNode[]> {
  const nodes: NavNode[] = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      if (entry.endsWith(".md")) {
        const node = await processFileEntry(entry, dirPath, relativePath, opts);
        if (node) nodes.push(node);
      } else {
        const result = await processDirEntry(
          entry,
          dirPath,
          relativePath,
          opts,
        );
        if (result) {
          if (Array.isArray(result)) {
            nodes.push(...result);
          } else {
            nodes.push(result);
          }
        }
      }
    } else if (typeof entry === "object") {
      nodes.push(
        ...(await processObjectEntry(entry, dirPath, relativePath, opts)),
      );
    }
  }

  return nodes;
}

async function scanDir(
  dirPath: string,
  relativePath: string,
  opts: ScanOptions,
): Promise<NavNode[]> {
  const navYml = await readNavYml(dirPath);
  if (navYml?.nav) {
    return processNavEntries(navYml.nav, dirPath, relativePath, opts);
  }
  return autoGenerateNav(dirPath, relativePath, opts);
}

async function autoGenerateNav(
  dirPath: string,
  relativePath: string,
  opts: ScanOptions,
): Promise<NavNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: NavNode[] = [];
  const mdFiles: string[] = [];
  const dirs: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    if (entry.isFile() && entry.name.endsWith(".md")) {
      mdFiles.push(entry.name);
    } else if (entry.isDirectory()) {
      dirs.push(entry.name);
    }
  }

  mdFiles.sort((a, b) => a.localeCompare(b));

  for (const file of mdFiles) {
    const node = await processFileEntry(file, dirPath, relativePath, opts);
    if (node) nodes.push(node);
  }

  dirs.sort((a, b) => a.localeCompare(b));
  for (const dir of dirs) {
    const result = await processDirEntry(dir, dirPath, relativePath, opts);
    if (result) {
      if (Array.isArray(result)) {
        nodes.push(...result);
      } else {
        nodes.push(result);
      }
    }
  }

  return nodes;
}

function collapseChains(nodes: NavNode[]): NavNode[] {
  return nodes.map((node) => {
    if (!node.children) return node;

    let collapsed = { ...node, children: collapseChains(node.children) };

    while (
      !collapsed.category &&
      collapsed.children?.length === 1 &&
      collapsed.children[0].children &&
      !collapsed.children[0].file
    ) {
      const child = collapsed.children[0];
      const parentWords = collapsed.title.toLowerCase();
      const childWords = child.title.toLowerCase();
      const deduped = parentWords.includes(childWords)
        ? collapsed.title
        : `${collapsed.title} / ${child.title}`;
      collapsed = {
        ...collapsed,
        title: deduped,
        path: child.path,
        children: child.children ?? [],
      };
    }

    return collapsed;
  });
}

export async function buildNavTree(
  docsDir: string,
  opts: ScanOptions,
): Promise<NavNode[]> {
  const raw = await scanDir(docsDir, "", opts);
  return collapseChains(raw);
}
