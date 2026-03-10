import { marked } from 'marked'

// Configure marked for clean, safe output
marked.setOptions({
  gfm: true,
  breaks: false,
})

/**
 * Render markdown string to HTML.
 * Wraps output in a .lesson-content div for styling.
 */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown) as string
  return html
}

/**
 * Extract a plain-text excerpt from markdown (for meta descriptions, etc.)
 */
export function markdownExcerpt(markdown: string, maxLength = 160): string {
  // Strip markdown syntax for a plain text summary
  const plain = markdown
    .replace(/#{1,6}\s+/g, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/`(.+?)`/g, '$1')       // inline code
    .replace(/```[\s\S]*?```/g, '')   // code blocks
    .replace(/>\s+/g, '')            // blockquotes
    .replace(/[-*+]\s+/g, '')        // list markers
    .replace(/\n+/g, ' ')           // newlines
    .trim()

  if (plain.length <= maxLength) return plain
  return plain.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}
