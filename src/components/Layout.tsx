import type { FC, PropsWithChildren } from 'hono/jsx'
import { DESIGN_SYSTEM_CSS } from '../styles/design-system'
import type { AuthUser } from '../lib/auth'

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
  noindex?: boolean
  user?: AuthUser | null
  clerkPubKey?: string
  fullWidth?: boolean
}>

const CLERK_CDN = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'

export const Layout: FC<LayoutProps> = ({ title, description, noindex, user, clerkPubKey, fullWidth, children }) => {
  const isEnrolled = user?.isEnrolled ?? false
  const isAdmin = user?.role === 'admin' || user?.role === 'facilitator'

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Learn Vibe Build</title>
        {description && <meta name="description" content={description} />}
        {noindex && <meta name="robots" content="noindex, nofollow" />}
        <meta property="og:image" content="https://learnvibe.build/og-image.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: DESIGN_SYSTEM_CSS }} />
        {clerkPubKey && (
          <>
            <script async crossorigin="anonymous" data-clerk-publishable-key={clerkPubKey} src={CLERK_CDN}></script>
            <script dangerouslySetInnerHTML={{ __html: `
              (async function(){
                try {
                  await new Promise(function(r,j){var a=0,c=setInterval(function(){a++;if(window.Clerk&&window.Clerk.load){clearInterval(c);r()}else if(a>50){clearInterval(c);j()}},100)});
                  await window.Clerk.load();
                } catch(e) { console.log('Clerk session keepalive: load skipped'); }
              })();
            `}} />
          </>
        )}
      </head>
      <body>
        <nav class="nav">
          <a href="/" class="nav-brand">Learn Vibe Build</a>
          <ul class="nav-links">
            {user ? (
              isEnrolled ? (
                <>
                  {/* Enrolled (or admin/facilitator): Cohort 1 | Community | Dashboard | [Admin] | Profile */}
                  <li><a href="/cohort/cohort-1">Cohort 1</a></li>
                  <li><a href="/community">Community</a></li>
                  <li><a href="/dashboard">Dashboard</a></li>
                  {isAdmin && (
                    <li><a href="/admin">Admin</a></li>
                  )}
                  <li>
                    <a href="/settings/profile" class="nav-user">
                      {user.name || user.email.split('@')[0]}
                    </a>
                  </li>
                </>
              ) : (
                <>
                  {/* Logged in, not enrolled: Curriculum | Dashboard | Apply | Profile */}
                  <li class="nav-hide-mobile"><a href="/curriculum">Curriculum</a></li>
                  <li><a href="/dashboard">Dashboard</a></li>
                  <li><a href="/apply" class="nav-apply">Apply</a></li>
                  <li>
                    <a href="/settings/profile" class="nav-user">
                      {user.name || user.email.split('@')[0]}
                    </a>
                  </li>
                </>
              )
            ) : (
              <>
                {/* Logged out: Curriculum | Sign In | Apply */}
                <li class="nav-hide-mobile"><a href="/curriculum">Curriculum</a></li>
                <li class="nav-hide-mobile"><a href="/sign-in">Sign In</a></li>
                <li><a href="/apply" class="nav-apply">Apply</a></li>
              </>
            )}
          </ul>
        </nav>
        <main class={fullWidth ? 'main-full' : ''}>{children}</main>
        <footer>
          <p>Learn Vibe Build &middot; Boulder, Colorado &middot; 2026</p>
          <p>Part of the cooperative at <a href="https://regenhub.xyz" target="_blank">Regen Hub</a></p>
        </footer>
      </body>
    </html>
  )
}
