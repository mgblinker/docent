import { defineConfig } from 'vite';

const MERMAID_PACKAGES = new Set([
  'mermaid',
  '@mermaid-js/parser',
  '@braintree/sanitize-url',
  '@iconify/utils',
  '@upsetjs/venn.js',
  'cytoscape',
  'cytoscape-cose-bilkent',
  'cytoscape-fcose',
  'd3',
  'd3-sankey',
  'dagre-d3-es',
  'dayjs',
  'dompurify',
  'es-toolkit',
  'katex',
  'khroma',
  'marked',
  'roughjs',
  'stylis',
  'ts-dedent',
  'uuid',
]);

function packageNameFromModuleId(id: string): string | null {
  const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(id);
  return match ? match[1] : null;
}

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Mermaid dynamically imports its own diagram renderers internally;
        // if Vite splits those into separate async chunks, the cross-chunk
        // dynamic import deadlocks (mermaid's diagram registry never settles).
        // Keeping mermaid + its rendering deps in one chunk avoids that.
        manualChunks(id) {
          const pkg = packageNameFromModuleId(id);
          if (pkg && MERMAID_PACKAGES.has(pkg)) return 'mermaid';
        },
      },
    },
  },
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
});
