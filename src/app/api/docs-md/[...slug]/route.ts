import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await props.params;
  const filePath = join(process.cwd(), 'content/docs', `${slug.join('/')}.mdx`);

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
