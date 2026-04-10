import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { applications, cohorts, payments, enrollments, users } from '../db/schema'
import { getStripe, isStripeConfigured, getAmountForTier, formatCents, createCheckoutSession } from '../lib/stripe'
import { syncUser } from '../lib/auth'
import type { AppContext } from '../types'

const payment = new Hono<AppContext>()

// ===== CHECKOUT: Create Stripe session and redirect =====
// Anyone with an approved application can access this (no auth required — they might not have an account yet)
payment.get('/payment/checkout/:applicationId', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env.DB)
  const applicationId = parseInt(c.req.param('applicationId'), 10)

  if (!isStripeConfigured(c.env.STRIPE_SECRET_KEY)) {
    return c.html(
      <Layout title="Payment" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Payment Not Available</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Payment processing is being set up. Please check back soon or contact us directly.
          </p>
          <a href="/" style="margin-top: 2rem; display: inline-block; color: var(--accent);">← Back to Home</a>
        </div>
      </Layout>
    )
  }

  // Get the application
  const app = await db.select().from(applications).where(eq(applications.id, applicationId)).get()

  if (!app) {
    return c.html(
      <Layout title="Not Found" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Application Not Found</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            We couldn't find this application. Please check the link and try again.
          </p>
          <a href="/" style="margin-top: 2rem; display: inline-block; color: var(--accent);">← Back to Home</a>
        </div>
      </Layout>,
      404
    )
  }

  // Must be approved
  if (app.status !== 'approved') {
    return c.html(
      <Layout title="Payment" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Application Not Ready</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            {app.status === 'pending'
              ? "Your application is still under review. We'll let you know when it's approved."
              : "This application is not eligible for payment."}
          </p>
          <a href="/apply/status" style="margin-top: 2rem; display: inline-block; color: var(--accent);">Check Application Status →</a>
        </div>
      </Layout>
    )
  }

  // Check if already enrolled (already paid)
  if (app.status === 'enrolled') {
    return c.redirect('/dashboard')
  }

  // Check for existing completed payment
  const existingPayment = await db.select().from(payments)
    .where(
      and(
        eq(payments.applicationId, applicationId),
        eq(payments.status, 'completed')
      )
    )
    .get()

  if (existingPayment) {
    return c.html(
      <Layout title="Already Paid" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Payment Already Completed</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Your payment has already been processed. You should have access to the cohort.
          </p>
          <a href="/dashboard" style="margin-top: 2rem; display: inline-block; color: var(--accent);">Go to Dashboard →</a>
        </div>
      </Layout>
    )
  }

  // Get cohort info for the checkout session
  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, app.cohortSlug)).get()

  if (!cohort) {
    return c.html(
      <Layout title="Error" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Cohort Not Found</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">The cohort for this application could not be found.</p>
        </div>
      </Layout>,
      500
    )
  }

  const amountCents = getAmountForTier(app.pricingTier)

  // Sponsored applicants ($0) — skip Stripe, auto-enroll
  if (amountCents === 0) {
    // If user is logged in, create enrollment directly
    if (user) {
      // Create enrollment
      const existingEnrollment = await db.select().from(enrollments)
        .where(and(eq(enrollments.userId, user.id), eq(enrollments.cohortId, cohort.id)))
        .get()

      if (!existingEnrollment) {
        await db.insert(enrollments).values({
          userId: user.id,
          cohortId: cohort.id,
          status: 'active',
        })
      }

      // Create $0 payment record
      await db.insert(payments).values({
        userId: user.id,
        applicationId: app.id,
        cohortId: cohort.id,
        amountCents: 0,
        status: 'completed',
        paidAt: new Date().toISOString(),
      })

      // Update application status
      await db.update(applications).set({ status: 'enrolled' }).where(eq(applications.id, app.id))

      return c.redirect('/payment/success?sponsored=true')
    }

    // Not logged in — show them a page to create account first
    return c.html(
      <Layout title="Complete Your Enrollment" user={null}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 4rem 0;">
          <p class="section-label">Sponsored</p>
          <h2>You're In!</h2>
          <p class="lead" style="margin-top: 1rem;">
            Your spot in {cohort.title} has been sponsored — no payment needed.
          </p>
          <p style="margin-top: 1.5rem; color: var(--text-secondary);">
            Create your account to get started:
          </p>
          <a href="/sign-up" style="display: inline-block; margin-top: 1.5rem; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Create Account →
          </a>
        </div>
      </Layout>
    )
  }

  // Create Stripe checkout session
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
  const baseUrl = new URL(c.req.url).origin

  try {
    const checkoutUrl = await createCheckoutSession({
      stripe,
      applicationId: app.id,
      applicantEmail: app.email,
      applicantName: app.name,
      cohortTitle: cohort.title,
      cohortId: cohort.id,
      amountCents,
      baseUrl,
    })

    // Create pending payment record
    await db.insert(payments).values({
      userId: user?.id ?? null,
      applicationId: app.id,
      cohortId: cohort.id,
      amountCents,
      status: 'pending',
    })

    return c.redirect(checkoutUrl)
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return c.html(
      <Layout title="Payment Error" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Payment Error</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Something went wrong creating the payment session. Please try again or contact us.
          </p>
          <a href={`/payment/checkout/${applicationId}`} style="display: inline-block; margin-top: 1.5rem; background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Try Again
          </a>
        </div>
      </Layout>,
      500
    )
  }
})

// ===== PAYMENT SUCCESS =====
payment.get('/payment/success', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.query('session_id')
  const sponsored = c.req.query('sponsored')

  if (sponsored === 'true') {
    return c.html(
      <Layout title="Welcome!" user={user}>
        <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 4rem 0;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
          <h2>You're enrolled!</h2>
          <p class="lead" style="margin-top: 1rem;">
            Your sponsored spot is confirmed. Welcome to Learn Vibe Build.
          </p>
          <a href="/dashboard" style="display: inline-block; margin-top: 2rem; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Go to Dashboard →
          </a>
        </div>
      </Layout>
    )
  }

  // Verify the Stripe session if we have a session ID
  if (sessionId && isStripeConfigured(c.env.STRIPE_SECRET_KEY)) {
    try {
      const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.payment_status === 'paid') {
        const db = getDb(c.env.DB)
        const applicationId = parseInt(session.metadata?.application_id || '0', 10)
        const cohortId = parseInt(session.metadata?.cohort_id || '0', 10)

        // Update payment record
        await db.update(payments)
          .set({
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            status: 'completed',
            paidAt: new Date().toISOString(),
          })
          .where(eq(payments.applicationId, applicationId))

        // Update application status to enrolled
        if (applicationId) {
          await db.update(applications)
            .set({ status: 'enrolled' })
            .where(eq(applications.id, applicationId))
        }

        // If user is logged in, create enrollment
        if (user && cohortId) {
          const existingEnrollment = await db.select().from(enrollments)
            .where(and(eq(enrollments.userId, user.id), eq(enrollments.cohortId, cohortId)))
            .get()

          if (!existingEnrollment) {
            await db.insert(enrollments).values({
              userId: user.id,
              cohortId,
              status: 'active',
            })
          }

          // Update payment with user ID
          await db.update(payments)
            .set({ userId: user.id })
            .where(eq(payments.stripeCheckoutSessionId, session.id))
        }
      }
    } catch (error) {
      console.error('Error verifying payment session:', error)
      // Continue to show success page — webhook will handle the actual enrollment
    }
  }

  return c.html(
    <Layout title="Payment Successful" user={user}>
      <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 4rem 0;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
        <h2>Payment successful!</h2>
        <p class="lead" style="margin-top: 1rem;">
          Welcome to Learn Vibe Build. Your enrollment is confirmed.
        </p>
        <p style="margin-top: 1.5rem; color: var(--text-secondary);">
          {user
            ? "Head to your dashboard to see your cohort."
            : "Create your account to access your cohort content."}
        </p>
        <a href={user ? "/dashboard" : "/sign-up"} style="display: inline-block; margin-top: 1.5rem; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
          {user ? "Go to Dashboard →" : "Create Account →"}
        </a>
      </div>
    </Layout>
  )
})

// ===== PAYMENT CANCELLED =====
payment.get('/payment/cancelled', async (c) => {
  const user = c.get('user')
  const applicationId = c.req.query('application_id')

  return c.html(
    <Layout title="Payment Cancelled" user={user}>
      <div class="page-section" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 4rem 0;">
        <h2>Payment Cancelled</h2>
        <p class="lead" style="margin-top: 1rem;">
          No worries — your application is still approved. You can complete payment whenever you're ready.
        </p>
        {applicationId && (
          <a href={`/payment/checkout/${applicationId}`} style="display: inline-block; margin-top: 2rem; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Try Again →
          </a>
        )}
        <p style="margin-top: 1.5rem;">
          <a href="/" style="color: var(--text-secondary);">← Back to Home</a>
        </p>
      </div>
    </Layout>
  )
})

export default payment
