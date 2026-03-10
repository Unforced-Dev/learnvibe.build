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
          href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: DESIGN_SYSTEM_CSS }} />
      </head>
      <body>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/cohort-1.html">Cohort 1</a></li>
            <li><a href="/apply">Apply</a></li>
          </ul>
        </nav>
        <main>{children}</main>
        <footer>
          <p>
            Learn Vibe Build &bull; Part of{' '}
            <a href="https://techne.institute">Techne Institute</a> at{' '}
            <a href="https://regenhub.xyz">Regen Hub</a> &bull; Boulder, Colorado &bull; 2026
          </p>
        </footer>
      </body>
    </html>
  )
}
