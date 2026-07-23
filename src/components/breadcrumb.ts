interface NavNode {
  title: string;
  path: string;
  file?: string;
  children?: NavNode[];
  category?: string;
}

function findPath(nodes: NavNode[], targetFile: string, trail: NavNode[]): NavNode[] | null {
  for (const node of nodes) {
    if (node.file === targetFile) {
      return [...trail, node];
    }
    if (node.children) {
      const result = findPath(node.children, targetFile, [...trail, node]);
      if (result) return result;
    }
  }
  return null;
}

export function renderBreadcrumbs(docPath: string, navTree: NavNode[]): void {
  const existing = document.querySelector('.breadcrumbs');
  if (existing) existing.remove();

  const trail = findPath(navTree, docPath, []);
  if (!trail || trail.length <= 1) return;

  const contentInner = document.getElementById('content-inner')!;
  const nav = document.createElement('nav');
  nav.className = 'breadcrumbs';

  trail.forEach((node, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'separator';
      sep.textContent = '/';
      nav.appendChild(sep);
    }

    if (i < trail.length - 1 && node.file) {
      const a = document.createElement('a');
      a.href = `#/${node.file.replace(/\.md$/, '')}`;
      a.textContent = node.title;
      nav.appendChild(a);
    } else if (i < trail.length - 1) {
      const span = document.createElement('span');
      span.textContent = node.title;
      nav.appendChild(span);
    } else {
      const span = document.createElement('span');
      span.textContent = node.title;
      nav.appendChild(span);
    }
  });

  contentInner.insertBefore(nav, contentInner.firstChild);
}
