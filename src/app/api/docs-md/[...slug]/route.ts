import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await props.params;
  const baseDir = join(process.cwd(), 'content/docs');
  const filePath = resolve(baseDir, `${slug.join('/')}.mdx`);
  if (!filePath.startsWith(baseDir + '/')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const raw = await readFile(filePath, 'utf-8');
    const content = raw.replace(/^---[\s\S]*?---\n*/, '');
    return new Response(content, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
