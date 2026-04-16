import { Resend } from 'resend'
import { getDb } from '../db'
import { emailLog } from '../db/schema'

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

// ===== BRANDED EMAIL WRAPPER =====

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #fafaf8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.7; }
    .email-container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .email-header { margin-bottom: 32px; }
    .email-brand { font-size: 16px; font-weight: 600; color: #1a1a1a; text-decoration: none; letter-spacing: -0.02em; }
    .email-body { background: #ffffff; border: 1px solid #e5e2db; border-radius: 12px; padding: 32px; margin-bottom: 32px; }
    .email-body h2 { font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; letter-spacing: -0.02em; }
    .email-body p { font-size: 15px; color: #555; margin: 0 0 16px 0; line-height: 1.7; }
    .email-body p:last-child { margin-bottom: 0; }
    .email-cta { display: inline-block; background: #e8612a; color: #ffffff !important; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 8px; }
    .email-divider { border: none; border-top: 1px solid #e5e2db; margin: 24px 0; }
    .email-muted { font-size: 13px; color: #999; }
    .email-footer { text-align: center; padding: 0 24px; }
    .email-footer p { font-size: 13px; color: #999; margin: 0; line-height: 1.6; }
    .email-footer a { color: #999; text-decoration: none; }
    .email-footer a:hover { color: #e8612a; }
    .email-highlight { background: #fef4f0; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
    .email-highlight p { color: #1a1a1a; margin: 0; font-size: 14px; }
    .email-highlight strong { color: #e8612a; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <a href="https://learnvibe.build" class="email-brand">Learn Vibe Build</a>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>Learn Vibe Build · Boulder, Colorado</p>
      <p><a href="https://learnvibe.build">learnvibe.build</a> · Part of <a href="https://regenhub.xyz">Regen Hub Cooperative</a></p>
    </div>
  </div>
</body>
</html>`
}

// ===== EMAIL TEMPLATES =====

export function applicationReceivedEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  return {
    subject: 'Application received — Learn Vibe Build',
    html: emailWrapper(`
      <h2>Thanks for applying, ${firstName}</h2>
      <p>We've received your application for Cohort 1. We'll review it and get back to you soon — typically within a few days.</p>
      <p>In the meantime, you can check your application status anytime:</p>
      <a href="https://learnvibe.build/apply/status" class="email-cta">Check Your Status</a>
      <hr class="email-divider">
      <p class="email-muted">If you have any questions, reply to this email or reach out at ag@unforced.dev.</p>
    `),
  }
}

export function applicationApprovedEmail(
  name: string,
  paymentUrl: string,
  tierLabel: string,
  amountFormatted: string,
  isSponsored: boolean
): { subject: string; html: string } {
  const firstName = name.split(' ')[0]

  if (isSponsored) {
    return {
      subject: "You're in! — Learn Vibe Build Cohort 1",
      html: emailWrapper(`
        <h2>Welcome, ${firstName}!</h2>
        <p>Great news — your application for Cohort 1 has been approved, and your spot has been sponsored. No payment needed.</p>
        <p>Complete your enrollment to get started:</p>
        <a href="${paymentUrl}" class="email-cta">Complete Enrollment →</a>
        <hr class="email-divider">
        <p class="email-muted">The course starts in April 2026. We'll send you details as we get closer. In the meantime, feel free to reply with any questions.</p>
      `),
    }
  }

  return {
    subject: "You're approved! — Learn Vibe Build Cohort 1",
    html: emailWrapper(`
      <h2>You're in, ${firstName}!</h2>
      <p>Your application for Cohort 1 has been approved. We're excited to have you.</p>
      <div class="email-highlight">
        <p><strong>${tierLabel}</strong> — ${amountFormatted}</p>
      </div>
      <p>Complete your payment to secure your spot:</p>
      <a href="${paymentUrl}" class="email-cta">Pay ${amountFormatted} & Enroll →</a>
      <hr class="email-divider">
      <p class="email-muted">The course starts in April 2026. Once you've paid, you'll get access to the cohort platform and all the details. Questions? Just reply to this email.</p>
    `),
  }
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
    return {
      subject: 'Your Cohort 1 spot is now sponsored — Learn Vibe Build',
      html: emailWrapper(`
        <h2>Good news, ${firstName}!</h2>
        <p>We've updated your enrollment — your spot in Cohort 1 is now <strong>sponsored</strong>. No payment required.</p>
        <p>Complete your enrollment to get started:</p>
        <a href="${paymentUrl}" class="email-cta">Complete Enrollment →</a>
        <hr class="email-divider">
        <p class="email-muted">Questions? Reply to this email or reach out at ag@unforced.dev.</p>
      `),
    }
  }

  return {
    subject: 'Your Cohort 1 pricing has been updated — Learn Vibe Build',
    html: emailWrapper(`
      <h2>Hi ${firstName},</h2>
      <p>We've updated the pricing on your Cohort 1 enrollment.</p>
      <div class="email-highlight">
        <p><strong>New price:</strong> ${tierLabel} — ${newAmountFormatted}<br>
        <span style="color: #6b7280; font-size: 0.9em;">(was ${oldAmountFormatted})</span></p>
      </div>
      <p>If you haven't paid yet, the updated amount will apply when you do:</p>
      <a href="${paymentUrl}" class="email-cta">Pay ${newAmountFormatted} & Enroll →</a>
      <hr class="email-divider">
      <p class="email-muted">Questions or need a different arrangement? Just reply — cost should never be a barrier.</p>
    `),
  }
}

export function applicationRejectedEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  return {
    subject: 'Update on your application — Learn Vibe Build',
    html: emailWrapper(`
      <h2>Hi ${firstName},</h2>
      <p>Thank you for applying to Learn Vibe Build Cohort 1. After careful consideration, we weren't able to offer you a spot in this cohort.</p>
      <p>This isn't a reflection of your potential — our cohorts are small and we can only take a limited number of participants each round.</p>
      <p>We'd love to see you apply again for a future cohort. We're always expanding what we offer, and there may be a better fit down the road.</p>
      <hr class="email-divider">
      <p class="email-muted">If you have any questions, feel free to reply to this email.</p>
    `),
  }
}

export function enrollmentConfirmedEmail(
  name: string,
  cohortTitle: string,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  return {
    subject: `Welcome to ${cohortTitle} — Learn Vibe Build`,
    html: emailWrapper(`
      <h2>You're enrolled, ${firstName}!</h2>
      <p>Your payment is confirmed and you're officially part of ${cohortTitle}. Welcome to the community.</p>
      <div class="email-highlight">
        <p><strong>What's next:</strong> We'll send you details about the first session as we get closer to the start date. In the meantime, create your account to access the platform.</p>
      </div>
      <a href="https://learnvibe.build/sign-up" class="email-cta">Create Your Account →</a>
      <hr class="email-divider">
      <p class="email-muted">Already have an account? <a href="https://learnvibe.build/dashboard" style="color: #e8612a; text-decoration: none;">Go to your dashboard</a>.</p>
    `),
  }
}

export function cohortBroadcastEmail(
  subject: string,
  markdownHtml: string,
): { subject: string; html: string } {
  return {
    subject: `${subject} — Learn Vibe Build`,
    html: emailWrapper(`
      ${markdownHtml}
      <hr class="email-divider">
      <p class="email-muted">You're receiving this because you're enrolled in a Learn Vibe Build cohort. <a href="https://learnvibe.build/dashboard" style="color: #e8612a; text-decoration: none;">View your dashboard</a>.</p>
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

async function logEmailSend(db: D1Database, to: string, subject: string, template: string, status: 'sent' | 'failed', error?: string) {
  try {
    const database = getDb(db)
    await database.insert(emailLog).values({ to, subject, template, status, error: error || null })
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
          await logEmailSend(params.db, r, params.subject, params.template, 'failed', result.error.message)
        }
      }
      return { success: false, error: result.error.message }
    }

    console.log(`[Email] Sent: "${params.subject}" → ${recipients.join(', ')}`)
    if (params.db && params.template) {
      for (const r of recipients) {
        await logEmailSend(params.db, r, params.subject, params.template, 'sent')
      }
    }
    return { success: true }
  } catch (err: any) {
    console.error('[Email] Exception:', err.message)
    if (params.db && params.template) {
      for (const r of recipients) {
        await logEmailSend(params.db, r, params.subject, params.template, 'failed', err.message)
      }
    }
    return { success: false, error: err.message }
  }
}

// ===== CONVENIENCE WRAPPERS =====
// These tie the templates + send together for easy use in routes

type EmailEnv = { RESEND_API_KEY: string; EMAIL_FROM: string; EMAIL_REPLY_TO?: string; DB?: D1Database }

export async function sendApplicationReceived(env: EmailEnv, email: string, name: string) {
  const tpl = applicationReceivedEmail(name)
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    to: email,
    ...tpl,
    db: env.DB,
    template: 'application_received',
  })
}

export async function sendApplicationApproved(
  env: EmailEnv,
  email: string,
  name: string,
  paymentUrl: string,
  tierLabel: string,
  amountFormatted: string,
  isSponsored: boolean
) {
  const tpl = applicationApprovedEmail(name, paymentUrl, tierLabel, amountFormatted, isSponsored)
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    to: email,
    ...tpl,
    db: env.DB,
    template: isSponsored ? 'application_approved_sponsored' : 'application_approved',
  })
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
  const tpl = applicationPriceChangedEmail(name, oldAmountFormatted, newAmountFormatted, tierLabel, paymentUrl, isSponsored)
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    to: email,
    ...tpl,
    db: env.DB,
    template: isSponsored ? 'application_price_changed_sponsored' : 'application_price_changed',
  })
}

export async function sendApplicationRejected(env: EmailEnv, email: string, name: string) {
  const tpl = applicationRejectedEmail(name)
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    to: email,
    ...tpl,
    db: env.DB,
    template: 'application_rejected',
  })
}

export async function sendEnrollmentConfirmed(
  env: EmailEnv,
  email: string,
  name: string,
  cohortTitle: string,
) {
  const tpl = enrollmentConfirmedEmail(name, cohortTitle)
  return sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    to: email,
    ...tpl,
    db: env.DB,
    template: 'enrollment_confirmed',
  })
}

export async function sendBroadcast(
  env: EmailEnv,
  emails: string[],
  subject: string,
  markdownHtml: string,
) {
  // Send individually for better deliverability
  const results = await Promise.allSettled(
    emails.map(email => {
      const tpl = cohortBroadcastEmail(subject, markdownHtml)
      return sendEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.EMAIL_FROM,
        to: email,
        ...tpl,
        db: env.DB,
        template: 'broadcast',
      })
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
  const failed = results.length - sent
  return { sent, failed, total: results.length }
}
