// Render email templates by key, reading from DB with a hardcoded fallback.
//
// Architecture:
//   - DB-stored templates live in the email_templates table (admin-editable).
//   - Hardcoded defaults live in ./email-templates-defaults.ts.
//   - renderEmailTemplate(db, key, vars) reads the DB row by key. If the row
//     is missing or `active=0`, it falls back to the default. Then it
//     substitutes {{var}} tokens, renders the body through `marked` (so
//     admins can author markdown OR inline HTML — both work), and wraps in
//     emailWrapper() for the brand chrome.
//
// Variable substitution:
//   - {{varName}} → value from `vars[varName]`
//   - Unknown vars are left as-is (so a template can reference {{firstName}}
//     even when the renderer doesn't know about it; no silent corruption).
//   - Subject and body are both substituted.
//
// All sendEmail callers route through this. Hardcoded template functions
// previously in src/lib/email.ts have been removed; defaults live with the
// templates module so the seed migration and the runtime fallback share one
// source of truth.

import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { emailTemplates } from '../db/schema'
import { renderMarkdown } from './markdown'
import { emailWrapper } from './email-wrapper'
import { DEFAULT_TEMPLATES, type EmailTemplateDefault } from './email-templates-defaults'

export interface RenderedEmail {
  subject: string
  html: string
}

/** Substitute `{{var}}` placeholders with values from `vars`. Unknown vars
 *  are left as-is (defensive — better to ship a literal `{{x}}` than to
 *  silently delete it). */
function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name] ?? '')
    }
    return match
  })
}

/** Look up the active DB template by key. Returns null on any failure (so
 *  we always fall back gracefully). */
async function fetchDbTemplate(db: D1Database | undefined, key: string): Promise<{ subject: string; bodyMarkdown: string } | null> {
  if (!db) return null
  try {
    const row = await getDb(db)
      .select({ subject: emailTemplates.subject, bodyMarkdown: emailTemplates.bodyMarkdown, active: emailTemplates.active })
      .from(emailTemplates)
      .where(eq(emailTemplates.key, key))
      .get()
    if (!row || row.active !== 1) return null
    return { subject: row.subject, bodyMarkdown: row.bodyMarkdown }
  } catch (e) {
    // Don't fail email sends because the templates table read tripped — log
    // and let the caller fall back to the hardcoded default.
    console.error(`[email-templates] DB lookup failed for "${key}":`, e)
    return null
  }
}

/** Render an email template by key. */
export async function renderEmailTemplate(
  db: D1Database | undefined,
  key: string,
  vars: Record<string, string> = {},
): Promise<RenderedEmail> {
  const fallback: EmailTemplateDefault | undefined = DEFAULT_TEMPLATES[key]
  const dbTpl = await fetchDbTemplate(db, key)

  // Prefer DB row when present + active. Otherwise fall back to the
  // hardcoded default. If neither exists, throw — that means a caller
  // referenced a template key that doesn't exist anywhere.
  const tpl = dbTpl ?? (fallback ? { subject: fallback.subject, bodyMarkdown: fallback.bodyMarkdown } : null)
  if (!tpl) {
    throw new Error(`renderEmailTemplate: no template found for key "${key}" (no DB row, no hardcoded default)`)
  }

  const subject = substitute(tpl.subject, vars)
  const bodyAfterVars = substitute(tpl.bodyMarkdown, vars)
  const bodyHtml = renderMarkdown(bodyAfterVars)
  const html = emailWrapper(bodyHtml)
  return { subject, html }
}

/** Synchronous fallback render — used by /admin/email/preview and the
 *  template editor's preview pane to render a default without DB access.
 *  Same substitution + markdown + wrapper logic. */
export function renderEmailTemplateFromSource(
  source: { subject: string; bodyMarkdown: string },
  vars: Record<string, string> = {},
): RenderedEmail {
  const subject = substitute(source.subject, vars)
  const bodyAfterVars = substitute(source.bodyMarkdown, vars)
  const html = emailWrapper(renderMarkdown(bodyAfterVars))
  return { subject, html }
}

export { DEFAULT_TEMPLATES, TEMPLATE_KEYS, TEMPLATE_LABELS } from './email-templates-defaults'
