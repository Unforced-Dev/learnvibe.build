import { Resend } from 'resend'
import { getDb } from '../db'
import { emailLog } from '../db/schema'
import { emailWrapper } from './email-wrapper'
import { renderEmailTemplate, renderEmailTemplateFromSource, DEFAULT_TEMPLATES } from './email-templates'
import { renderMarkdown } from './markdown'

let resendClient: Resend | null = null

function getResend(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export function isEmailConfigured(apiKey: string | undefined): boolean {
  return !!apiKey && apiKey.startsWith('re_') && apiKey.length > 10
}

// Re-export emailWrapper for backwards-compat — preview pages and other
// callers used to import it from here.
export { emailWrapper }

// ===== TEMPLATE PREVIEW HELPERS =====
// Used by /admin/email/preview to render preview cases. These wrap
// renderEmailTemplate but feed in placeholder vars so admin can see what
// the email looks like with sample data.
//
// We keep these as thin wrappers (subject/html only) so the preview page
// continues to work without DB access — they call into renderEmailTemplate
// with `db=undefined`, which routes straight to the hardcoded default.

export function applicationReceivedEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  return previewTemplate('application_received', { firstName })
}

export function applicationApprovedEmail(
  name: string,
  paymentUrl: string,
  tierLabel: string,
  amountFormatted: string,
  isSponsored: boolean,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  if (isSponsored) {
    return previewTemplate('application_approved_sponsored', { firstName, paymentUrl })
  }
  return previewTemplate('application_approved', { firstName, paymentUrl, tierLabel, amountFormatted })
}

export function applicationPriceChangedEmail(
  name: string,
  oldAmountFormatted: string,
  newAmountFormatted: string,
  tierLabel: string,
  paymentUrl: string,
  isSponsored: boolean,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  if (isSponsored) {
    return previewTemplate('application_price_changed_sponsored', { firstName, paymentUrl })
  }
  return previewTemplate('application_price_changed', {
    firstName, oldAmountFormatted, newAmountFormatted, tierLabel, paymentUrl,
  })
}

export function applicationRejectedEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  return previewTemplate('application_rejected', { firstName })
}

export function enrollmentConfirmedEmail(
  name: string,
  cohortTitle: string,
  alreadyHasAccount: boolean = false,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  return previewTemplate(
    alreadyHasAccount ? 'enrollment_confirmed_has_account' : 'enrollment_confirmed_no_account',
    { firstName, cohortTitle },
  )
}

// Synchronous helper for preview cases that don't have DB access at hand —
// renders directly from the hardcoded default. Equivalent to calling
// renderEmailTemplate(undefined, ...) but synchronous.
function previewTemplate(key: string, vars: Record<string, string>): { subject: string; html: string } {
  const tpl = DEFAULT_TEMPLATES[key]
  if (!tpl) throw new Error(`previewTemplate: unknown key "${key}"`)
  return renderEmailTemplateFromSource({ subject: tpl.subject, bodyMarkdown: tpl.bodyMarkdown }, vars)
}

// ===== BROADCAST EMAIL =====
// Broadcasts use a different flow — admin types the body markdown directly
// in the composer; there's no template key to look up. Keep the existing
// wrapper structure here.

export type BroadcastAudience = 'enrolled' | 'approved' | 'applicants' | 'generic'

function broadcastFooter(audience: BroadcastAudience): string {
  switch (audience) {
    case 'enrolled':
      return `You're receiving this because you're enrolled in a Learn Vibe Build cohort. <a href="https://learnvibe.build/dashboard" style="color: #e8612a; text-decoration: none;">View your dashboard</a>.`
    case 'approved':
      return `You're receiving this because your Learn Vibe Build application was approved. <a href="https://learnvibe.build/apply/status" style="color: #e8612a; text-decoration: none;">Check your status</a>.`
    case 'applicants':
      return `You're receiving this because you applied to Learn Vibe Build. <a href="https://learnvibe.build/apply/status" style="color: #e8612a; text-decoration: none;">Check your application status</a>.`
    case 'generic':
    default:
      return `You're receiving this because you're part of the Learn Vibe Build community.`
  }
}

export function cohortBroadcastEmail(
  subject: string,
  markdownHtml: string,
  audience: BroadcastAudience = 'enrolled',
): { subject: string; html: string } {
  return {
    subject: `${subject} — Learn Vibe Build`,
    html: emailWrapper(`
      ${markdownHtml}
      <hr class="email-divider">
      <p class="email-muted">${broadcastFooter(audience)}</p>
    `),
  }
}

// ===== SEND FUNCTION =====

interface SendEmailParams {
  apiKey: string
  from: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  db?: D1Database
  template?: string
}

async function logEmailSend(
  db: D1Database,
  to: string,
  subject: string,
  template: string,
  status: 'sent' | 'failed',
  error?: string,
  bodyHtml?: string,
) {
  try {
    const database = getDb(db)
    await database.insert(emailLog).values({
      to, subject, template, status,
      error: error || null,
      bodyHtml: bodyHtml || null,
    })
  } catch (e) {
    console.error('[Email] Failed to log email send:', e)
  }
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const recipients = Array.isArray(params.to) ? params.to : [params.to]

  if (!isEmailConfigured(params.apiKey)) {
    console.log(`[Email] Skipped (not configured): "${params.subject}" → ${recipients.join(', ')}`)
    return { success: true } // Don't fail — just skip when not configured
  }

  try {
    const resend = getResend(params.apiKey)
    const result = await resend.emails.send({
      from: params.from,
      to: recipients,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo || 'ag@unforced.dev',
    })

    if (result.error) {
      console.error('[Email] Send error:', result.error)
      if (params.db && params.template) {
        for (const r of recipients) {
          // Persist body_html on failure too, so admin can resend without
          // re-rendering — useful for "the recipient was bad, resend to a
          // corrected address" workflows.
          await logEmailSend(params.db, r, params.subject, params.template, 'failed', result.error.message, params.html)
        }
      }
      return { success: false, error: result.error.message }
    }

    // Treat missing email id as failure — Resend should always return one on success.
    if (!result.data?.id) {
      const msg = 'No email id returned by provider'
      console.error('[Email] Send error:', msg, result)
      if (params.db && params.template) {
        for (const r of recipients) {
          await logEmailSend(params.db, r, params.subject, params.template, 'failed', msg, params.html)
        }
      }
      return { success: false, error: msg }
    }

    console.log(`[Email] Sent: "${params.subject}" → ${recipients.join(', ')} (id=${result.data.id})`)
    if (params.db && params.template) {
      for (const r of recipients) {
        await logEmailSend(params.db, r, params.subject, params.template, 'sent', undefined, params.html)
      }
    }
    return { success: true }
  } catch (err: any) {
    console.error('[Email] Exception:', err.message)
    if (params.db && params.template) {
      for (const r of recipients) {
        await logEmailSend(params.db, r, params.subject, params.template, 'failed', err.message, params.html)
      }
    }
    return { success: false, error: err.message }
  }
}

// ===== CONVENIENCE WRAPPERS =====
// These tie templates + send together. Each one routes through
// renderEmailTemplate(env.DB, key, vars) so DB-stored templates take
// precedence with a hardcoded fallback when missing.

export type EmailEnv = { RESEND_API_KEY: string; EMAIL_FROM: string; EMAIL_REPLY_TO?: string; DB?: D1Database }

async function sendByTemplate(
  env: EmailEnv,
  to: string,
  templateKey: string,
  vars: Record<string, string>,
) {
  const { subject, html } = await renderEmailTemplate(env.DB, templateKey, vars)
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    to,
    subject,
    html,
    db: env.DB,
    template: templateKey,
  })
}

export async function sendApplicationReceived(env: EmailEnv, email: string, name: string) {
  return sendByTemplate(env, email, 'application_received', { firstName: name.split(' ')[0] })
}

export async function sendApplicationApproved(
  env: EmailEnv,
  email: string,
  name: string,
  paymentUrl: string,
  tierLabel: string,
  amountFormatted: string,
  isSponsored: boolean,
) {
  const firstName = name.split(' ')[0]
  if (isSponsored) {
    return sendByTemplate(env, email, 'application_approved_sponsored', { firstName, paymentUrl })
  }
  return sendByTemplate(env, email, 'application_approved', { firstName, paymentUrl, tierLabel, amountFormatted })
}

export async function sendApplicationPriceChanged(
  env: EmailEnv,
  email: string,
  name: string,
  oldAmountFormatted: string,
  newAmountFormatted: string,
  tierLabel: string,
  paymentUrl: string,
  isSponsored: boolean,
) {
  const firstName = name.split(' ')[0]
  if (isSponsored) {
    return sendByTemplate(env, email, 'application_price_changed_sponsored', { firstName, paymentUrl })
  }
  return sendByTemplate(env, email, 'application_price_changed', {
    firstName, oldAmountFormatted, newAmountFormatted, tierLabel, paymentUrl,
  })
}

export async function sendApplicationRejected(env: EmailEnv, email: string, name: string) {
  return sendByTemplate(env, email, 'application_rejected', { firstName: name.split(' ')[0] })
}

export async function sendEnrollmentConfirmed(
  env: EmailEnv,
  email: string,
  name: string,
  cohortTitle: string,
  alreadyHasAccount: boolean = false,
) {
  const firstName = name.split(' ')[0]
  const key = alreadyHasAccount ? 'enrollment_confirmed_has_account' : 'enrollment_confirmed_no_account'
  return sendByTemplate(env, email, key, { firstName, cohortTitle })
}

export interface BroadcastResult {
  sent: string[]
  failed: { email: string; error: string }[]
  total: number
}

export async function sendBroadcast(
  env: EmailEnv,
  emails: string[],
  subject: string,
  markdownHtml: string,
  audience: BroadcastAudience = 'enrolled',
): Promise<BroadcastResult> {
  // Resend's free tier caps at 5 requests/second. Send in chunks of 4
  // (one under the limit for safety) with a 1.1s delay between chunks
  // so a 50-recipient broadcast takes ~13s instead of failing.
  const CHUNK_SIZE = 4
  const CHUNK_DELAY_MS = 1100

  const sent: string[] = []
  const failed: { email: string; error: string }[] = []

  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE)
    const settled = await Promise.allSettled(
      chunk.map(email => {
        const tpl = cohortBroadcastEmail(subject, markdownHtml, audience)
        return sendEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.EMAIL_FROM,
          replyTo: env.EMAIL_REPLY_TO,
          to: email,
          ...tpl,
          db: env.DB,
          template: 'broadcast',
        })
      })
    )
    settled.forEach((res, j) => {
      const email = chunk[j]
      if (res.status === 'fulfilled' && res.value.success) {
        sent.push(email)
      } else {
        const error = res.status === 'fulfilled'
          ? (res.value.error || 'Unknown error')
          : (res.reason instanceof Error ? res.reason.message : String(res.reason))
        failed.push({ email, error })
      }
    })
    // Wait between chunks so we don't bunch up against the rate limit.
    // Skip the wait after the final chunk.
    if (i + CHUNK_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS))
    }
  }

  return { sent, failed, total: emails.length }
}

// renderMarkdown is re-exported so admin route handlers that compose plain
// markdown into the broadcast wrapper (without a template lookup) keep
// working through the same import path.
export { renderMarkdown }
