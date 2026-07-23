import { DOC_TYPE_ICONS, FOLDER_ICON } from "./icons";

interface NavNode {
  title: string;
  path: string;
  file?: string;
  children?: NavNode[];
  category?: string;
  docType?: string;
}

let navigateFn: (path: string) => void;
let sidebarEl: HTMLElement;
let fullTree: NavNode[] = [];

function expandState(key: string): boolean {
  const stored = sessionStorage.getItem(`nav:${key}`);
  return stored === 'expanded';
}

function setExpandState(key: string, expanded: boolean): void {
  sessionStorage.setItem(`nav:${key}`, expanded ? 'expanded' : 'collapsed');
}

function filterTree(nodes: NavNode[], docType: string | null): NavNode[] {
  if (!docType) return nodes;

  return nodes.reduce<NavNode[]>((acc, node) => {
    // Check children first: a folder can carry both `file` (its own
    // index.md) and `children` since folder labels became clickable, so
    // `file` alone no longer means "pure leaf" - filtering still needs to
    // descend into children even when the folder itself has a file.
    if (node.children) {
      const filtered = filterTree(node.children, docType);
      if (filtered.length > 0) {
        acc.push({ ...node, children: filtered });
      }
      return acc;
    }

    if (node.file) {
      const matches = docType === 'other'
        ? !node.docType
        : node.docType === docType;
      if (matches) acc.push(node);
      return acc;
    }
    return acc;
  }, []);
}

function renderNode(node: NavNode, depth: number): string {
  if (node.file && !node.children) {
    const icon = DOC_TYPE_ICONS[node.docType || 'other'] || DOC_TYPE_ICONS.other;
    return `<li><a class="nav-link type-${node.docType || 'other'}" href="#" data-path="${node.file}" style="padding-left: ${20 + depth * 12}px">${icon}<span>${node.title}</span></a></li>`;
  }

  if (node.children && node.children.length > 0) {
    const expanded = expandState(node.path);
    const chevronCls = expanded ? 'chevron' : 'chevron collapsed';
    const groupCls = expanded ? 'nav-group' : 'nav-group collapsed';

    const childrenHtml = node.children.map(c => renderNode(c, depth + 1)).join('');

    const labelInner = node.file
      ? `<a class="nav-link nav-group-index-link" href="#" data-path="${node.file}">${FOLDER_ICON}${node.title}</a>`
      : `<span>${FOLDER_ICON}${node.title}</span>`;

    return `<li class="${groupCls}" data-group="${node.path}">
      <div class="nav-group-label" style="padding-left: ${20 + depth * 12}px" data-toggle="${node.path}">
        ${labelInner}
        <span class="${chevronCls}">&#9660;</span>
      </div>
      <ul>${childrenHtml}</ul>
    </li>`;
  }

  return '';
}

function renderTree(tree: NavNode[]): void {
  let html = '';

  for (const node of tree) {
    if (node.category) {
      html += `<div class="nav-category">${node.category}</div>`;
      if (node.children) {
        html += '<ul>';
        html += node.children.map(c => renderNode(c, 0)).join('');
        html += '</ul>';
      }
    } else {
      html += `<ul>${renderNode(node, 0)}</ul>`;
    }
  }

  sidebarEl.innerHTML = html || '<p style="padding: 20px; color: var(--color-text-muted);">No documents in this category</p>';
}

export function renderSidebar(tree: NavNode[], navigate: (path: string) => void): void {
  navigateFn = navigate;
  sidebarEl = document.getElementById('sidebar-content')!;
  fullTree = tree;

  renderTree(tree);

  sidebarEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const link = target.closest('.nav-link') as HTMLElement;
    if (link) {
      e.preventDefault();
      const path = link.dataset.path;
      if (path) navigateFn(path);
      document.getElementById('sidebar')?.classList.remove('open');
      document.querySelector('.sidebar-overlay')?.classList.remove('visible');
      return;
    }

    const toggle = target.closest('[data-toggle]') as HTMLElement;
    if (toggle) {
      const groupKey = toggle.dataset.toggle!;
      const group = toggle.closest('.nav-group') as HTMLElement;
      if (group) {
        const isCollapsed = group.classList.toggle('collapsed');
        setExpandState(groupKey, !isCollapsed);
        const chevron = toggle.querySelector('.chevron');
        if (chevron) {
          chevron.classList.toggle('collapsed', isCollapsed);
        }
      }
    }
  });
}

export function filterSidebar(docType: string | null): void {
  const filtered = filterTree(fullTree, docType);
  renderTree(filtered);
}

export function setActive(docPath: string): void {
  if (!sidebarEl) return;

  sidebarEl.querySelectorAll('.nav-link.active').forEach(el => {
    el.classList.remove('active');
  });

  const link = sidebarEl.querySelector(`[data-path="${docPath}"]`) as HTMLElement;
  if (link) {
    link.classList.add('active');
    let parent = link.parentElement;
    while (parent && parent !== sidebarEl) {
      if (parent.classList.contains('nav-group') && parent.classList.contains('collapsed')) {
        parent.classList.remove('collapsed');
        const key = parent.dataset.group;
        if (key) setExpandState(key, true);
        const chevron = parent.querySelector(':scope > .nav-group-label .chevron');
        if (chevron) chevron.classList.remove('collapsed');
      }
      parent = parent.parentElement;
    }
    link.scrollIntoView({ block: 'nearest' });
  }
}
