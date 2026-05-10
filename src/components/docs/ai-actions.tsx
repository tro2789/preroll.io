'use client';

import { useState } from 'react';

export function AIActions({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = 'https://preroll.io';
  const pageUrl = `${siteUrl}/docs/${slug}`;
  const fullDocsUrl = `${siteUrl}/llms-full.txt`;

  const claudePrompt = `Read the PreRoll documentation at ${fullDocsUrl} — I'm currently on the "${title}" page (${pageUrl}). Help me with any questions I have.`;
  const chatgptPrompt = claudePrompt;

  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(claudePrompt)}`;
  const chatgptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatgptPrompt)}`;

  async function copyMarkdown() {
    try {
      const res = await fetch(`/api/docs-md/${slug}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: copy the page URL
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-fd-border pb-4 mb-6 text-sm">
      <span className="text-fd-muted-foreground mr-1">Open with AI:</span>
      <a
        href={claudeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1 text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-primary/50 transition-colors"
      >
        Claude
        <ExternalIcon />
      </a>
      <a
        href={chatgptUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1 text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-primary/50 transition-colors"
      >
        ChatGPT
        <ExternalIcon />
      </a>
      <button
        onClick={copyMarkdown}
        className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1 text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-primary/50 transition-colors cursor-pointer"
      >
        {copied ? 'Copied!' : 'Copy as Markdown'}
      </button>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 1.5H2a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V7.5M7 1.5h3.5V5M5.5 6.5l5-5" />
    </svg>
  );
}
