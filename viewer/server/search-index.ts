import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';

export interface SearchDoc {
  id: string;
  title: string;
  body: string;
  path: string;
}

function stripMarkdown(content: string): string {
  return content
    // Remove frontmatter
    .replace(/^---[\s\S]*?---\n?/, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emphasis
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

export async function buildSearchIndex(
  docsDir: string,
  excludePatterns: string[],
): Promise<SearchDoc[]> {
  const files = await fg('**/*.md', {
    cwd: docsDir,
    ignore: excludePatterns,
    onlyFiles: true,
    absolute: false,
  });

  const docs: SearchDoc[] = [];

  for (const relPath of files.sort()) {
    try {
      const content = await fs.readFile(path.join(docsDir, relPath), 'utf-8');
      const title = extractTitle(content) || relPath.replace(/\.md$/, '').split('/').pop() || relPath;
      const body = stripMarkdown(content);

      docs.push({
        id: relPath,
        title,
        body: body.slice(0, 5000),
        path: relPath,
      });
    } catch {
      // skip unreadable files
    }
  }

  return docs;
}
