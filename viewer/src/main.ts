import { renderContent, initRenderer, postRender } from "./components/content";
import { renderSidebar, setActive, filterSidebar } from "./components/sidebar";
import { renderBreadcrumbs } from "./components/breadcrumb";
import { initSearch } from "./components/search";
import { CATEGORY_ICONS, DOC_TYPE_ICONS, FOLDER_ICON, COMPONENT_ICONS, SUN_ICON, MOON_ICON } from "./components/icons";

const THEME_STORAGE_KEY = "docs-theme";

function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) toggleBtn.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
}

function initialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let currentTheme = initialTheme();
applyTheme(currentTheme);

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  applyTheme(currentTheme);
});

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

function countDocTypes(node: NavNode, counts: Record<string, number>): number {
  let total = 0;
  if (node.file) {
    const key = node.docType || "other";
    counts[key] = (counts[key] || 0) + 1;
    total += 1;
  }
  if (node.children) {
    for (const child of node.children) total += countDocTypes(child, counts);
  }
  return total;
}

function findFirstFileAny(node: NavNode): string | null {
  if (node.file) return node.file;
  if (node.children) {
    for (const child of node.children) {
      const found = findFirstFileAny(child);
      if (found) return found;
    }
  }
  return null;
}

function renderComponentTile(node: NavNode): string {
  const counts: Record<string, number> = {};
  const total = countDocTypes(node, counts);
  const firstFile = findFirstFileAny(node);
  const badges = Object.entries(counts)
    .map(
      ([type, count]) =>
        `<span class="component-badge badge-${type}">${DOC_TYPE_ICONS[type] || DOC_TYPE_ICONS.other} ${count}</span>`,
    )
    .join("");
  const componentIcon = COMPONENT_ICONS[node.path.split("/")[0]] || FOLDER_ICON;

  return `
    <a class="component-tile" href="#" data-file="${firstFile || ""}">
      <span class="component-tile-title">${componentIcon} ${node.title}</span>
      <span class="component-tile-count">${total} doc${total === 1 ? "" : "s"}</span>
      <span class="component-tile-badges">${badges}</span>
    </a>
  `;
}

function findFirstFileOfType(node: NavNode, docType: string): string | null {
  if (node.file) return node.docType === docType ? node.file : null;
  if (node.children) {
    for (const child of node.children) {
      const found = findFirstFileOfType(child, docType);
      if (found) return found;
    }
  }
  return null;
}

function countOfType(node: NavNode, docType: string): number {
  if (node.file) return node.docType === docType ? 1 : 0;
  let total = 0;
  if (node.children) {
    for (const child of node.children) total += countOfType(child, docType);
  }
  return total;
}

// Cross-cutting tile: same look as renderComponentTile, but links to the
// module's first doc of a specific type (e.g. its architecture doc) and
// counts only that type - used for the Architecture / Manuals and HowTos
// sections, which show modules "again" (additive view), not their full doc set.
function renderCrossCuttingTile(node: NavNode, docType: string): string {
  const total = countOfType(node, docType);
  const firstFile = findFirstFileOfType(node, docType);
  const componentIcon = COMPONENT_ICONS[node.path.split("/")[0]] || FOLDER_ICON;

  return `
    <a class="component-tile" href="#" data-file="${firstFile || ""}">
      <span class="component-tile-title">${componentIcon} ${node.title}</span>
      <span class="component-tile-count">${total} doc${total === 1 ? "" : "s"}</span>
    </a>
  `;
}

function showWelcome(): void {
  const contentEl = document.getElementById("content-inner");
  const tocEl = document.getElementById("toc");
  if (!contentEl || !tocEl) return;

  const categories = navTree.filter((node) => node.category);
  const flowsCat = categories.find((cat) => cat.category === "Flows");
  const moduleCats = categories.filter((cat) => cat.category !== "Flows");
  const allModules = moduleCats.flatMap((cat) => cat.children || []);
  const architectureModules = allModules.filter((m) => countOfType(m, "architecture") > 0);
  const manualModules = allModules.filter((m) => countOfType(m, "manual") > 0);

  const flowsSection = flowsCat
    ? `
      <section class="category-section">
        <h2 class="category-heading">${CATEGORY_ICONS.Flows || ""} Flows</h2>
        <div class="component-grid">${(flowsCat.children || []).map(renderComponentTile).join("")}</div>
      </section>
    `
    : "";

  const architectureSection = architectureModules.length
    ? `
      <section class="category-section">
        <h2 class="category-heading">${CATEGORY_ICONS.Architecture || ""} Architecture</h2>
        <div class="component-grid">${architectureModules.map((m) => renderCrossCuttingTile(m, "architecture")).join("")}</div>
      </section>
    `
    : "";

  const modulesSection = `
    <section class="category-section">
      <h2 class="category-heading">${CATEGORY_ICONS["Modules and Services"] || ""} Modules and Services</h2>
      ${moduleCats
        .map(
          (cat) => `
        <h3 class="category-subheading">${CATEGORY_ICONS[cat.category || ""] || ""} ${cat.category}</h3>
        <div class="component-grid">${(cat.children || []).map(renderComponentTile).join("")}</div>
      `,
        )
        .join("")}
    </section>
  `;

  const manualSection = manualModules.length
    ? `
      <section class="category-section">
        <h2 class="category-heading">${CATEGORY_ICONS["Manuals and HowTos"] || ""} Manuals and HowTos</h2>
        <div class="component-grid">${manualModules.map((m) => renderCrossCuttingTile(m, "manual")).join("")}</div>
      </section>
    `
    : "";

  contentEl.innerHTML = `
    <div class="welcome">
      <h1>Processity Docs</h1>
      <p class="welcome-subtitle">Browse by section below, or use the tabs above to browse by document type across all components</p>
      ${flowsSection}${architectureSection}${modulesSection}${manualSection}
    </div>
  `;
  tocEl.innerHTML = "";

  contentEl.querySelectorAll<HTMLElement>(".component-tile").forEach((tile) => {
    tile.addEventListener("click", (e) => {
      e.preventDefault();
      const file = tile.dataset.file;
      if (file) navigateTo(file);
    });
  });
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
  if (!tabBar) return;

  const homeTab: DocType = { id: "modules", label: "Modules and Services" };
  const allTypes = [homeTab, ...docTypes, { id: "other", label: "Other" }];

  tabBar.innerHTML = allTypes
    .map(
      (dt) =>
        `<button class="tab${dt.id === "modules" ? " active" : ""}" data-tab="${dt.id}">${DOC_TYPE_ICONS[dt.id] || DOC_TYPE_ICONS.other} ${dt.label}</button>`,
    )
    .join("");

  tabBar.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".tab") as HTMLElement;
    if (!btn) return;

    tabBar
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab || "modules";
    filterSidebar(tab === "modules" ? null : tab);
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
