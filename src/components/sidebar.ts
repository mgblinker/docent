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

function expandState(key: string, depth: number): boolean {
  const stored = sessionStorage.getItem(`nav:${key}`);
  if (stored) return stored === 'expanded';
  return depth === 0;
}

function setExpandState(key: string, expanded: boolean): void {
  sessionStorage.setItem(`nav:${key}`, expanded ? 'expanded' : 'collapsed');
}

function filterTree(nodes: NavNode[], docType: string | null): NavNode[] {
  if (!docType) return nodes;

  return nodes.reduce<NavNode[]>((acc, node) => {
    if (node.file) {
      const matches = docType === 'other'
        ? !node.docType
        : node.docType === docType;
      if (matches) acc.push(node);
      return acc;
    }

    if (node.children) {
      const filtered = filterTree(node.children, docType);
      if (filtered.length > 0) {
        acc.push({ ...node, children: filtered });
      }
    }
    return acc;
  }, []);
}

function renderNode(node: NavNode, depth: number): string {
  if (node.file) {
    return `<li><a class="nav-link" href="#" data-path="${node.file}" style="padding-left: ${20 + depth * 12}px">${node.title}</a></li>`;
  }

  if (node.children && node.children.length > 0) {
    const expanded = expandState(node.path, depth);
    const chevronCls = expanded ? 'chevron' : 'chevron collapsed';
    const groupCls = expanded ? 'nav-group' : 'nav-group collapsed';

    const childrenHtml = node.children.map(c => renderNode(c, depth + 1)).join('');

    return `<li class="${groupCls}" data-group="${node.path}">
      <div class="nav-group-label" style="padding-left: ${20 + depth * 12}px" data-toggle="${node.path}">
        <span>${node.title}</span>
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
