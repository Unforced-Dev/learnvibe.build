import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

marked.setOptions({
  gfm: true,
  breaks: false,
})

// Allowlist of tags we emit from markdown, plus a few extras (tables, task lists).
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'a', 'img',
  'strong', 'em', 'b', 'i', 'u', 'del', 's', 'code', 'pre', 'kbd', 'mark',
  'ul', 'ol', 'li',
  'blockquote', 'q',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'input', // for GFM task list checkboxes — restricted via allowedAttributes below
  'span', 'div',
]

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    input: ['type', 'checked', 'disabled'], // GFM task list
    code: ['class'], // highlight.js-style language-foo
    pre: ['class'],
    span: ['class'],
    div: ['class'],
    th: ['align'],
    td: ['align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
  disallowedTagsMode: 'discard',
}

export function renderMarkdown(markdown: string): string {
  const unsafe = marked.parse(markdown) as string
  return sanitizeHtml(unsafe, SANITIZE_OPTIONS)
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
