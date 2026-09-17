import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { buildNavTree, filterNavTree, type ScanOptions, type DocTypeConfig } from './scanner.js';
import { buildSearchIndex } from './search-index.js';
import { createAuthChecker, type AuthConfig } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ViewerConfig {
  docsDir: string;
  siteTitle: string;
  exclude: string[];
  navExcludeFiles?: string[];
  transparentFolders?: string[];
  docTypes?: DocTypeConfig[];
  auth?: AuthConfig;
}

async function loadConfig(): Promise<ViewerConfig> {
  const raw = await fs.readFile(path.join(__dirname, '..', 'viewer.config.yaml'), 'utf-8');
  return yaml.load(raw) as ViewerConfig;
}

function buildScanOpts(config: ViewerConfig): ScanOptions {
  return {
    exclude: config.exclude,
    navExcludeFiles: config.navExcludeFiles ?? [],
    transparentFolders: config.transparentFolders ?? [],
    docTypes: config.docTypes ?? [],
  };
}

async function main() {
  const config = await loadConfig();
  const docsDir = path.resolve(__dirname, '..', process.env.DOCS_DIR || config.docsDir);
  const app = express();
  const port = Number.parseInt(process.env.PORT || '3100');
  const scanOpts = buildScanOpts(config);

  console.log('Building navigation tree...');
  let navTree = await buildNavTree(docsDir, scanOpts);
  console.log('Building search index...');
  let searchDocs = await buildSearchIndex(docsDir, config.exclude);
  let docAudience = new Map(searchDocs.map((d) => [d.path, d.audience]));
  console.log(`Indexed ${searchDocs.length} documents.`);

  const isAuthenticated = createAuthChecker(config.auth ?? {});
  const docTypes = (config.docTypes ?? []).map(d => ({ id: d.id, label: d.label }));

  app.get('/api/config', (_req, res) => {
    res.json({ siteTitle: config.siteTitle, docTypes });
  });

  app.get('/api/tree', async (req, res) => {
    res.json(filterNavTree(navTree, await isAuthenticated(req)));
  });

  app.get('/api/search-index', async (req, res) => {
    const authed = await isAuthenticated(req);
    res.json(authed ? searchDocs : searchDocs.filter((d) => d.audience === 'public'));
  });

  app.post('/api/rebuild', async (_req, res) => {
    navTree = await buildNavTree(docsDir, scanOpts);
    searchDocs = await buildSearchIndex(docsDir, config.exclude);
    docAudience = new Map(searchDocs.map((d) => [d.path, d.audience]));
    res.json({ ok: true, docs: searchDocs.length });
  });

  app.get('/api/doc/*docPath', async (req, res) => {
    const raw = req.params.docPath;
    const docPath = Array.isArray(raw) ? raw.join('/') : raw;
    if (!docPath || docPath.includes('..')) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }
    // 404, not 403, for a gated doc when unauthenticated - doesn't reveal
    // that an internal-only doc exists at this path.
    if (docAudience.get(docPath) !== 'public' && !(await isAuthenticated(req))) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const filePath = path.join(docsDir, docPath);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      res.type('text/plain').send(content);
    } catch {
      res.status(404).json({ error: 'Not found' });
    }
  });

  const distDir = path.join(__dirname, '..', 'dist');
  try {
    await fs.access(distDir);
    console.log(`Serving static files from: ${distDir}`);
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } catch {
    console.log('No dist/ directory found — dev mode (use Vite proxy)');
  }

  app.listen(port, () => {
    console.log(`Docs server running at http://localhost:${port}`);
    console.log(`Serving docs from: ${docsDir}`);
  });
}

main().catch(console.error);
