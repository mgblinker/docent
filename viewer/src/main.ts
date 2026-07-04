import { renderContent, initRenderer, postRender } from "./components/content";
import { renderSidebar, setActive, filterSidebar } from "./components/sidebar";
import { renderBreadcrumbs } from "./components/breadcrumb";
import { initSearch } from "./components/search";

interface NavNode {
  title: string;
  path: string;
  file?: string;
  children?: NavNode[];
  category?: string;
  docType?: string;
}

interface DocType {
  id: string;
  label: string;
}

const navTree: NavNode[] = [];
let allDocTypes: DocType[] = [];

const TYPE_ICONS: Record<string, string> = {
  architecture: "&#9645;",
  feature: "&#9733;",
  howto: "&#9881;",
  manual: "&#9776;",
  other: "&#8943;",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  architecture: "System design, data models, and architectural decisions",
  feature: "Feature descriptions, implementations, and component documentation",
  howto: "Guides, conventions, migration paths, and debugging tips",
  manual: "User-facing documentation, booking calendars, and UI guides",
  other: "Documents not yet categorized",
};

function showWelcome(): void {
  const contentEl = document.getElementById("content-inner");
  const tocEl = document.getElementById("toc");
  if (!contentEl || !tocEl) return;

  const types = [...allDocTypes, { id: "other", label: "Other" }];
  const tiles = types
    .map(
      (dt) => `
    <a class="welcome-tile tile-${dt.id}" href="#" data-type="${dt.id}">
      <span class="welcome-tile-icon">${TYPE_ICONS[dt.id] || ""}</span>
      <span class="welcome-tile-label">${dt.label}</span>
      <span class="welcome-tile-desc">${TYPE_DESCRIPTIONS[dt.id] || ""}</span>
    </a>
  `,
    )
    .join("");

  contentEl.innerHTML = `
    <div class="welcome">
      <h1>Processity Docs</h1>
      <p class="welcome-subtitle">Browse documentation by category</p>
      <div class="welcome-grid">${tiles}</div>
    </div>
  `;
  tocEl.innerHTML = "";

  contentEl.querySelectorAll<HTMLElement>(".welcome-tile").forEach((tile) => {
    tile.addEventListener("click", (e) => {
      e.preventDefault();
      const type = tile.dataset.type;
      if (type) selectTab(type);
    });
  });
}

function findFirstFile(nodes: NavNode[], docType: string): string | null {
  for (const node of nodes) {
    if (node.file) {
      const matches =
        docType === "other" ? !node.docType : node.docType === docType;
      if (matches) return node.file;
    }
    if (node.children) {
      const found = findFirstFile(node.children, docType);
      if (found) return found;
    }
  }
  return null;
}

function selectTab(typeId: string): void {
  const tabBar = document.getElementById("tab-bar");
  if (!tabBar) return;

  tabBar.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  const btn = tabBar.querySelector(`[data-tab="${typeId}"]`);
  if (btn) btn.classList.add("active");

  filterSidebar(typeId);

  const firstFile = findFirstFile(navTree, typeId);
  if (firstFile) navigateTo(firstFile);
}

async function loadPage(
  docPath: string,
  anchor: string | null = null,
): Promise<void> {
  if (docPath === "index.md") {
    showWelcome();
    return;
  }

  const contentEl = document.getElementById("content-inner");
  const tocEl = document.getElementById("toc");
  if (!contentEl || !tocEl) return;

  try {
    const res = await fetch(`/api/doc/${docPath}`);
    if (!res.ok) {
      contentEl.innerHTML = `<h1>Not Found</h1><p>Could not load <code>${docPath}</code></p>`;
      tocEl.innerHTML = "";
      return;
    }
    const markdown = await res.text();
    const { html, toc } = await renderContent(markdown, docPath);

    contentEl.innerHTML = html;
    tocEl.innerHTML = toc;
    setActive(docPath);
    renderBreadcrumbs(docPath, navTree);

    await postRender(contentEl);

    contentEl.scrollTo(0, 0);
    document.querySelector(".content")?.scrollTo(0, 0);

    // Scroll to anchor if provided
    if (anchor) {
      setTimeout(() => {
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  } catch {
    contentEl.innerHTML = `<h1>Error</h1><p>Failed to load page.</p>`;
    tocEl.innerHTML = "";
  }
}

function getPathFromHash(): { path: string; anchor: string | null } {
  let hash = globalThis.location.hash;

  // Remove the leading '#'
  if (hash.startsWith("#")) {
    hash = hash.slice(1);
  }

  // Remove the leading '/' if present
  if (hash.startsWith("/")) {
    hash = hash.slice(1);
  }

  if (!hash) return { path: "index.md", anchor: null };

  // Split on '#' to separate path from anchor
  const [pathPart, ...anchorParts] = hash.split("#");
  const anchor = anchorParts.length > 0 ? anchorParts.join("#") : null;

  const normalizedPath = pathPart.endsWith(".md") ? pathPart : `${pathPart}.md`;
  return { path: normalizedPath, anchor };
}

function navigateTo(docPath: string, anchor: string | null = null): void {
  const hashPath = docPath.replace(/\.md$/, "");
  const anchorPart = anchor ? `#${anchor}` : "";
  globalThis.location.hash = `#/${hashPath}${anchorPart}`;
}

function renderTabs(docTypes: DocType[]): void {
  const tabBar = document.getElementById("tab-bar");
  if (!tabBar || docTypes.length === 0) return;

  const allTypes = [...docTypes, { id: "other", label: "Other" }];

  tabBar.innerHTML = allTypes
    .map((dt) => `<button class="tab" data-tab="${dt.id}">${dt.label}</button>`)
    .join("");

  tabBar.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".tab") as HTMLElement;
    if (!btn) return;

    const wasActive = btn.classList.contains("active");
    tabBar
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));

    if (wasActive) {
      filterSidebar(null);
    } else {
      btn.classList.add("active");
      const tab = btn.dataset.tab || null;
      filterSidebar(tab);
    }
  });
}

await initRenderer();

try {
  const [treeRes, configRes] = await Promise.all([
    fetch("/api/tree"),
    fetch("/api/config"),
  ]);
  const tree: NavNode[] = await treeRes.json();
  const config: { siteTitle: string; docTypes: DocType[] } =
    await configRes.json();

  navTree.length = 0;
  navTree.push(...tree);
  allDocTypes = config.docTypes;
  renderSidebar(navTree, navigateTo);
  renderTabs(config.docTypes);

  const titleEl = document.querySelector(".site-title");
  if (titleEl) titleEl.textContent = config.siteTitle;
} catch {
  const sidebarContent = document.getElementById("sidebar-content");
  if (sidebarContent) {
    sidebarContent.innerHTML =
      '<p style="padding: 20px; color: var(--color-text-muted);">Failed to load navigation</p>';
  }
}

initSearch(navigateTo);

globalThis.addEventListener("hashchange", () => {
  const { path, anchor } = getPathFromHash();
  loadPage(path, anchor);
});

// Sidebar toggle (desktop and mobile)
const toggle = document.querySelector(".sidebar-toggle");
const sidebar = document.getElementById("sidebar");
const layout = document.querySelector(".layout");
let overlay = document.querySelector(".sidebar-overlay") as HTMLElement | null;
if (!overlay) {
  overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);
}

const isMobile = () => window.innerWidth <= 768;

toggle?.addEventListener("click", () => {
  if (isMobile()) {
    // Mobile: toggle open class and show overlay
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("visible");
  } else {
    // Desktop: toggle collapsed class on layout
    layout?.classList.toggle("sidebar-collapsed");
    sidebar?.classList.toggle("collapsed");
    // Store preference in localStorage
    const isCollapsed = sidebar?.classList.contains("collapsed");
    localStorage.setItem("sidebar-collapsed", isCollapsed ? "true" : "false");
  }
});

overlay.addEventListener("click", () => {
  if (isMobile()) {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("visible");
  }
});

// Restore sidebar state on load (desktop only)
if (!isMobile()) {
  const wasCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
  if (wasCollapsed) {
    sidebar?.classList.add("collapsed");
    layout?.classList.add("sidebar-collapsed");
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  const mobile = isMobile();
  if (mobile) {
    // On mobile, reset to open state and remove collapsed class
    sidebar?.classList.remove("collapsed");
    layout?.classList.remove("sidebar-collapsed");
  }
});

const { path: initialPath, anchor: initialAnchor } = getPathFromHash();
await loadPage(initialPath, initialAnchor);

export type { NavNode };
