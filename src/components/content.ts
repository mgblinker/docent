import MarkdownIt from "markdown-it";
import { initMermaidZoom } from "./mermaid-zoom";

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
  architecture: "Architecture",
  feature: "Feature",
  howto: "How-to",
  manual: "User Manual",
};

export async function renderContent(
  markdown: string,
  docPath: string = "",
): Promise<{ html: string; toc: string }> {
  currentToc = [];
  const { body, meta } = parseFrontMatter(markdown);
  let html = "";
  if (meta.type && TYPE_LABELS[meta.type]) {
    html += `<span class="doc-type-chip chip-${meta.type}">${TYPE_LABELS[meta.type]}</span>`;
  }
  html += md.render(body);
  const toc = buildTocHtml(currentToc, docPath);
  return { html, toc };
}

let mermaidReady: Promise<any> | null = null;

function loadMermaid(): Promise<any> {
  mermaidReady ??= new Promise((resolve, reject) => {
    const w = globalThis as any;
    if (w.mermaid) {
      resolve(w.mermaid);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/mermaid@11/dist/mermaid.min.js";
    script.integrity =
      "sha384-XftqXEFYz4bxmLHkh0i+5WjPx8bWnxnMTjJsUuYUhKvvhRHKKXrQJNBpWIuWAE2Y";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      w.mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });
      resolve(w.mermaid);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mermaidReady;
}

export async function postRender(container: HTMLElement): Promise<void> {
  const mermaidDivs = container.querySelectorAll<HTMLElement>(
    "div.mermaid:not(.zoom-initialized)",
  );
  if (mermaidDivs.length === 0) return;

  try {
    const mermaidLib = await loadMermaid();
    await mermaidLib.run({ nodes: mermaidDivs });
    initMermaidZoom(container);
  } catch (err) {
    console.error("Mermaid rendering failed:", err);
  }
}
