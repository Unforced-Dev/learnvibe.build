import type { FC, PropsWithChildren } from 'hono/jsx'
import { DESIGN_SYSTEM_CSS } from '../styles/design-system'

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
  noindex?: boolean
}>

export const Layout: FC<LayoutProps> = ({ title, description, noindex, children }) => {
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
      </head>
      <body>
        <nav class="nav">
          <a href="/" class="nav-brand">Learn Vibe Build</a>
          <ul class="nav-links">
            <li><a href="/cohort/cohort-1">Cohort 1</a></li>
            <li><a href="/apply" class="nav-apply">Apply</a></li>
          </ul>
        </nav>
        <main>{children}</main>
        <footer>
          <p>Learn Vibe Build &middot; Boulder, Colorado &middot; 2026</p>
          <p>Part of the cooperative at <a href="https://regenhub.xyz" target="_blank">Regen Hub</a></p>
        </footer>
      </body>
    </html>
  )
}
