import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { createClerkClient } from '@clerk/backend'
import { Layout } from '../components/Layout'
import { syncUser, isClerkConfigured } from '../lib/auth'
import type { AppContext } from '../types'

const auth = new Hono<AppContext>()

const CLERK_CDN = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'

function clerkScript(action: string) {
  return `
    (async function() {
      try {
        // Clerk v5 CDN auto-initializes via data-clerk-publishable-key attribute.
        // window.Clerk becomes the instance once loaded. Wait for it.
        await new Promise(function(resolve, reject) {
          var attempts = 0;
          var check = setInterval(function() {
            attempts++;
            if (window.Clerk && window.Clerk.load) { clearInterval(check); resolve(); }
            else if (attempts > 50) { clearInterval(check); reject(new Error('Clerk failed to load')); }
          }, 100);
        });
        var clerk = window.Clerk;
        await clerk.load();
        ${action}
      } catch (e) {
        console.error('Clerk error:', e);
        var el = document.getElementById('clerk-sign-in') || document.getElementById('clerk-sign-up');
        if (el) {
          el.innerHTML =
            '<div style="text-align:center;padding:2rem;">' +
            '<p style="color:#555;margin-bottom:1rem;">Authentication failed to load.</p>' +
            '<p style="color:#999;font-size:0.85rem;">If you have an ad blocker, try disabling it for this page and refreshing.</p>' +
            '</div>';
        }
      }
    })();
  `
}

// ===== SIGN-IN PAGE =====
auth.get('/sign-in', (c) => {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY

  if (!isClerkConfigured(c)) {
    return c.html(
      <Layout title="Sign In" user={null}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Sign In</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Authentication is not yet configured. Check back soon.
          </p>
          <a href="/" class="back-link" style="margin-top: 2rem; display: inline-block;">← Back to Home</a>
        </div>
      </Layout>
    )
  }

  return c.html(
    <Layout title="Sign In" user={null}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto; padding: 4rem 0;">
        <div id="clerk-sign-in" style="display: flex; justify-content: center;"></div>
      </div>
      <script async crossorigin="anonymous" data-clerk-publishable-key={pubKey} src={CLERK_CDN}></script>
      <script dangerouslySetInnerHTML={{ __html: clerkScript(`
        var redirectUrl = new URLSearchParams(window.location.search).get('redirect_url') || '';
        var callbackUrl = '/auth/callback' + (redirectUrl ? '?redirect_url=' + encodeURIComponent(redirectUrl) : '');
        if (clerk.user) {
          window.location.href = callbackUrl;
        } else {
          clerk.mountSignIn(document.getElementById('clerk-sign-in'), {
            afterSignInUrl: callbackUrl,
            afterSignUpUrl: callbackUrl,
          });
        }
      `) }} />
    </Layout>
  )
})

// ===== SIGN-UP PAGE =====
auth.get('/sign-up', (c) => {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY

  if (!isClerkConfigured(c)) {
    return c.html(
      <Layout title="Sign Up" user={null}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Sign Up</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Authentication is not yet configured. Check back soon.
          </p>
          <a href="/" class="back-link" style="margin-top: 2rem; display: inline-block;">← Back to Home</a>
        </div>
      </Layout>
    )
  }

  return c.html(
    <Layout title="Sign Up" user={null}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto; padding: 4rem 0;">
        <div id="clerk-sign-up" style="display: flex; justify-content: center;"></div>
      </div>
      <script async crossorigin="anonymous" data-clerk-publishable-key={pubKey} src={CLERK_CDN}></script>
      <script dangerouslySetInnerHTML={{ __html: clerkScript(`
        var redirectUrl = new URLSearchParams(window.location.search).get('redirect_url') || '';
        var callbackUrl = '/auth/callback' + (redirectUrl ? '?redirect_url=' + encodeURIComponent(redirectUrl) : '');
        if (clerk.user) {
          window.location.href = callbackUrl;
        } else {
          clerk.mountSignUp(document.getElementById('clerk-sign-up'), {
            afterSignInUrl: callbackUrl,
            afterSignUpUrl: callbackUrl,
          });
        }
      `) }} />
    </Layout>
  )
})

// ===== AUTH CALLBACK — Sync user to D1 =====
auth.get('/auth/callback', async (c) => {
  if (!isClerkConfigured(c)) {
    return c.redirect('/')
  }

  try {
    const authState = getAuth(c)
    if (!authState?.userId) {
      return c.redirect('/sign-in')
    }

    // Use Clerk Backend API to get user details
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY })
    const clerkUser = await clerk.users.getUser(authState.userId)

    // Sync to our DB
    await syncUser(
      c,
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || '',
      `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null
    )

    // Redirect to original page if provided, otherwise dashboard
    const redirectUrl = c.req.query('redirect_url') || '/dashboard'
    // Sanitize: only allow relative paths to prevent open redirect.
    // Hono's query parser decodes the value before we check, so encoded slashes are safe.
    const safeRedirect = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/dashboard'
    return c.redirect(safeRedirect)
  } catch (e) {
    console.error('Auth callback error:', e)
    // If Clerk user was deleted or session is stale, sign out to clear cookies
    return c.redirect('/sign-out')
  }
})

// ===== SIGN-OUT =====
auth.get('/sign-out', (c) => {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY

  if (!isClerkConfigured(c)) {
    return c.redirect('/')
  }

  return c.html(
    <Layout title="Signing Out" user={null}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
        <p style="color: var(--text-secondary);">Signing out...</p>
      </div>
      <script async crossorigin="anonymous" data-clerk-publishable-key={pubKey} src={CLERK_CDN}></script>
      <script dangerouslySetInnerHTML={{ __html: clerkScript(`
        await clerk.signOut();
        window.location.href = '/';
      `) }} />
    </Layout>
  )
})

export default auth
