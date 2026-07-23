import MiniSearch from 'minisearch';

interface SearchDoc {
  id: string;
  title: string;
  body: string;
  path: string;
}

let miniSearch: MiniSearch<SearchDoc> | null = null;
let navigateFn: (path: string) => void;
let selectedIndex = -1;
let resultItems: HTMLElement[] = [];

export function initSearch(navigate: (path: string) => void): void {
  navigateFn = navigate;

  const container = document.getElementById('search-container')!;
  container.innerHTML = `
    <div class="search-input-wrapper">
      <span class="search-icon">&#128269;</span>
      <input type="text" class="search-input" placeholder="Search docs..." aria-label="Search documentation">
      <span class="search-shortcut">${navigator.platform.includes('Mac') ? '&#8984;K' : 'Ctrl+K'}</span>
      <div class="search-results" id="search-results"></div>
    </div>
  `;

  const input = container.querySelector('.search-input') as HTMLInputElement;
  const results = document.getElementById('search-results')!;

  loadIndex();

  let debounceTimer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(input.value, results), 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      results.classList.remove('visible');
      input.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectResult(selectedIndex + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectResult(selectedIndex - 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && resultItems[selectedIndex]) {
        resultItems[selectedIndex].click();
      }
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.length >= 2) {
      results.classList.add('visible');
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node)) {
      results.classList.remove('visible');
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

async function loadIndex(): Promise<void> {
  try {
    const res = await fetch('/api/search-index');
    const docs: SearchDoc[] = await res.json();
    miniSearch = new MiniSearch<SearchDoc>({
      fields: ['title', 'body'],
      storeFields: ['title', 'path'],
      searchOptions: {
        boost: { title: 3 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    miniSearch.addAll(docs);
  } catch {
    console.warn('Failed to load search index');
  }
}

function search(query: string, resultsEl: HTMLElement): void {
  if (!miniSearch || query.length < 2) {
    resultsEl.classList.remove('visible');
    return;
  }

  const hits = miniSearch.search(query, { limit: 10 });
  selectedIndex = -1;

  if (hits.length === 0) {
    resultsEl.innerHTML = '<div class="search-no-results">No results found</div>';
    resultsEl.classList.add('visible');
    resultItems = [];
    return;
  }

  resultsEl.innerHTML = hits.map(hit => {
    const pathDisplay = (hit as any).path.replace(/\.md$/, '').replace(/\//g, ' / ');
    return `<a class="search-result-item" href="#" data-path="${(hit as any).path}">
      <div class="search-result-title">${escapeHtml((hit as any).title || 'Untitled')}</div>
      <div class="search-result-path">${escapeHtml(pathDisplay)}</div>
    </a>`;
  }).join('');

  resultsEl.classList.add('visible');
  resultItems = Array.from(resultsEl.querySelectorAll('.search-result-item'));

  resultItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const path = item.dataset.path;
      if (path) {
        navigateFn(path);
        resultsEl.classList.remove('visible');
        (document.querySelector('.search-input') as HTMLInputElement).value = '';
      }
    });
  });
}

function selectResult(index: number): void {
  if (resultItems.length === 0) return;
  selectedIndex = Math.max(0, Math.min(index, resultItems.length - 1));
  resultItems.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedIndex);
  });
  resultItems[selectedIndex]?.scrollIntoView({ block: 'nearest' });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
