import MarkdownIt from "markdown-it";
import mermaid from "mermaid";
import { initMermaidZoom } from "./mermaid-zoom";
import { initOverviewGraph } from "./overview-graph";
import { DOC_TYPE_ICONS } from "./icons";

let md: MarkdownIt;
let highlighter: {
  codeToHtml: (code: string, opts: { lang: string; theme: string }) => string;
  getLoadedLanguages: () => string[];
} | null = null;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

let currentToc: TocEntry[] = [];

function anchorPlugin(mdInstance: MarkdownIt): void {
  const originalOpen = mdInstance.renderer.rules.heading_open;
  const originalClose = mdInstance.renderer.rules.heading_close;

  mdInstance.renderer.rules.heading_open = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    const token = tokens[idx];
    const level = Number.parseInt(token.tag.slice(1));
    const contentToken = tokens[idx + 1];
    const text =
      contentToken?.children
        ?.filter((t) => t.type === "text" || t.type === "code_inline")
        .map((t) => t.content)
        .join("") || "";
    const id = slugify(text);
    token.attrSet("id", id);

    if (level >= 2 && level <= 4) {
      currentToc.push({ id, text, level });
    }

    if (originalOpen) return originalOpen(tokens, idx, options, env, self);
    return self.renderToken(tokens, idx, options);
  };

  mdInstance.renderer.rules.heading_close = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    const openToken = tokens[idx - 2];
    const id = openToken?.attrGet("id") || "";
    const anchor = `<a class="heading-anchor" href="#${id}" aria-hidden="true">#</a>`;

    if (originalClose)
      return anchor + originalClose(tokens, idx, options, env, self);
    return anchor + self.renderToken(tokens, idx, options);
  };
}

function mermaidFencePlugin(mdInstance: MarkdownIt): void {
  const defaultFence = mdInstance.renderer.rules.fence;

  mdInstance.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() === "mermaid") {
      return `<div class="mermaid">${token.content}</div>\n`;
    }
    if (token.info.trim() === "overview-graph") {
      return `<div class="overview-graph-wrapper"><script type="application/json" data-overview-graph>${token.content}</script></div>\n`;
    }
    if (defaultFence) return defaultFence(tokens, idx, options, env, self);
    return self.renderToken(tokens, idx, options);
  };
}

function createHighlightFn(): (code: string, lang: string) => string {
  return (code: string, lang: string) => {
    try {
      if (lang && highlighter?.getLoadedLanguages().includes(lang)) {
        return highlighter.codeToHtml(code, { lang, theme: "github-light" });
      }
    } catch {
      /* fallback */
    }
    const escaped = md.utils.escapeHtml(code);
    return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
  };
}

export async function initRenderer(): Promise<void> {
  md = new MarkdownIt({
    html: true,
    linkify: true,
    highlight: createHighlightFn(),
  });

  md.use(anchorPlugin);
  md.use(mermaidFencePlugin);

  // Load Shiki in the background — pages render immediately without highlighting
  import("shiki")
    .then(async (shiki) => {
      highlighter = await shiki.createHighlighter({
        themes: ["github-light"],
        langs: [
          "typescript",
          "javascript",
          "html",
          "css",
          "json",
          "yaml",
          "bash",
          "csharp",
          "sql",
          "xml",
          "markdown",
          "dockerfile",
          "python",
          "shell",
        ],
      });
      console.log("Shiki syntax highlighter loaded");
    })
    .catch((err) => {
      console.warn("Shiki failed to load, using plain code blocks:", err);
    });
}

function buildTocHtml(entries: TocEntry[], docPath: string): string {
  if (entries.length === 0) return "";

  let html = '<div class="toc-title">On this page</div><ul>';
  const pathWithoutMd = docPath.replace(/\.md$/, "");
  for (const entry of entries) {
    const cls = `toc-h${entry.level}`;
    html += `<li><a class="${cls}" href="#/${pathWithoutMd}#${entry.id}">${entry.text}</a></li>`;
  }
  html += "</ul>";
  return html;
}

interface FrontMatter {
  type?: string;
  [key: string]: unknown;
}

function parseFrontMatter(markdown: string): {
  body: string;
  meta: FrontMatter;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!match) return { body: markdown, meta: {} };
  const meta: FrontMatter = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) meta[key] = val;
  }
  return { body: markdown.slice(match[0].length), meta };
}

const TYPE_LABELS: Record<string, string> = {
  flows: "Flows",
  architecture: "Architecture",
  manual: "Manuals and HowTos",
};

// "feature" and "howto" are legacy frontmatter values from before those
// buckets were merged into "manual" (Manuals and HowTos) - dozens of
// existing docs still carry the old value and haven't been individually
// reviewed/relabeled yet, so this normalizes them at render time instead
// of mass-editing file frontmatter. Keeps the chip's label AND color
// consistent (both keyed off the normalized id) rather than showing three
// different colors for what's now one category.
const TYPE_ALIASES: Record<string, string> = { feature: "manual", howto: "manual" };

export async function renderContent(
  markdown: string,
  docPath: string = "",
): Promise<{ html: string; toc: string }> {
  currentToc = [];
  const { body, meta } = parseFrontMatter(markdown);
  let html = "";
  const normalizedType = meta.type ? TYPE_ALIASES[meta.type] || meta.type : undefined;
  if (normalizedType && TYPE_LABELS[normalizedType]) {
    html += `<span class="doc-type-chip chip-${normalizedType}">${DOC_TYPE_ICONS[normalizedType] || ""} ${TYPE_LABELS[normalizedType]}</span>`;
  }
  html += md.render(body);
  const toc = buildTocHtml(currentToc, docPath);
  return { html, toc };
}

let mermaidInitialized = false;

function ensureMermaidInitialized(): void {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
  });
  mermaidInitialized = true;
}

let mermaidRenderCounter = 0;

export async function postRender(container: HTMLElement): Promise<void> {
  initOverviewGraph(container);

  const mermaidDivs = container.querySelectorAll<HTMLElement>(
    "div.mermaid:not(.zoom-initialized)",
  );
  if (mermaidDivs.length === 0) return;

  ensureMermaidInitialized();

  for (const div of Array.from(mermaidDivs)) {
    const source = div.textContent || "";
    const id = `mermaid-diagram-${mermaidRenderCounter++}`;
    try {
      const { svg } = await mermaid.render(id, source);
      div.innerHTML = svg;
    } catch (err) {
      console.error("Mermaid rendering failed:", err);
      div.innerHTML = `<pre>${source}</pre>`;
    }
  }

  initMermaidZoom(container);
}
