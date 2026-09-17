import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import yaml from "js-yaml";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

export function isImagePath(assetPath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(assetPath).toLowerCase());
}

// Missing/unrecognized `audience:` frontmatter defaults to "internal" -
// mirrors scanner.ts's extractFileMeta default.
function extractAudience(content: string): "public" | "internal" {
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!fmMatch) return "internal";
  const fm = yaml.load(fmMatch[1]) as Record<string, unknown>;
  return fm?.audience === "public" ? "public" : "internal";
}

// Local image references only (`![alt](path)` and `<img src="path">`) -
// skips absolute URLs/data URIs, which aren't served by this app anyway.
function extractImageRefs(content: string): string[] {
  const refs: string[] = [];
  for (const re of [/!\[[^\]]*\]\(([^)]+)\)/g, /<img[^>]+src=["']([^"']+)["']/g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const src = m[1].trim();
      if (/^([a-z]+:)?\/\//.test(src) || src.startsWith("data:")) continue;
      refs.push(src);
    }
  }
  return refs;
}

function resolveRelative(baseDir: string, relPath: string): string {
  const stack: string[] = [];
  for (const part of `${baseDir}/${relPath}`.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

// An asset is servable to anonymous visitors only if at least one
// audience:public doc references it - mirrors the doc-level default-closed
// policy, so embedding a screenshot in an internal doc doesn't silently
// expose it through a guessable asset URL. Once a path is marked public by
// any referencing doc, a later internal-doc reference to the same path
// doesn't downgrade it back.
export async function buildAssetAudienceIndex(
  docsDir: string,
  excludePatterns: string[],
): Promise<Map<string, "public" | "internal">> {
  const files = await fg("**/*.md", { cwd: docsDir, ignore: excludePatterns, onlyFiles: true });
  const index = new Map<string, "public" | "internal">();

  for (const relPath of files) {
    try {
      const content = await fs.readFile(path.join(docsDir, relPath), "utf-8");
      const audience = extractAudience(content);
      const dir = path.dirname(relPath);
      for (const ref of extractImageRefs(content)) {
        const resolved = resolveRelative(dir === "." ? "" : dir, ref);
        if (index.get(resolved) !== "public") index.set(resolved, audience);
      }
    } catch {
      // skip unreadable files
    }
  }

  return index;
}
