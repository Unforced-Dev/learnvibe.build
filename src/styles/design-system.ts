export const DESIGN_SYSTEM_CSS = `
:root {
    --bg: #fafaf8;
    --surface: #f3f1ed;
    --border: #e5e2db;
    --white: #ffffff;
    --text: #1a1a1a;
    --text-secondary: #555;
    --text-tertiary: #999;
    --accent: #e8612a;
    --accent-hover: #d05520;
    --accent-soft: #fef4f0;
    --dark: #111;
    --dark-text: #aaa;
    --font-display: 'Space Grotesk', sans-serif;
    --font-body: 'Inter', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
    font-family: var(--font-body);
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    font-size: 17px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* NAV */
.nav {
    padding: 1.25rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1100px;
    margin: 0 auto;
}

.nav-brand {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
    text-decoration: none;
    letter-spacing: -0.02em;
}

.nav-links {
    display: flex;
    gap: 2rem;
    list-style: none;
    align-items: center;
}

.nav-links a {
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s;
}

.nav-links a:hover { color: var(--text); }

.nav-apply {
    background: var(--accent);
    color: var(--white) !important;
    padding: 0.5rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.9rem;
    transition: background 0.2s !important;
}

.nav-apply:hover {
    background: var(--accent-hover) !important;
}

@media (max-width: 600px) {
    .nav { padding: 1rem 1.5rem; }
    .nav-links { gap: 1.25rem; }
}

/* MAIN CONTENT */
main {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 2rem;
}

.page-section {
    padding: 4rem 0;
}

.section-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--accent);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 1rem;
}

h2 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    color: var(--text);
    margin-bottom: 1.25rem;
    letter-spacing: -0.03em;
    line-height: 1.15;
}

h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.35rem;
    color: var(--text);
    margin: 2rem 0 0.75rem;
    letter-spacing: -0.02em;
}

p {
    color: var(--text-secondary);
    margin-bottom: 1.25rem;
    max-width: 65ch;
}

.lead {
    font-size: 1.1rem;
    font-weight: 300;
    line-height: 1.8;
    color: var(--text);
}

strong { color: var(--text); font-weight: 600; }
em { font-style: italic; }

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* APPLY BUTTON */
.apply-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 500;
    background: var(--accent);
    color: var(--white);
    border: none;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
    margin-top: 1.5rem;
}

.apply-btn:hover {
    background: var(--accent-hover);
    text-decoration: none;
    transform: translateY(-1px);
}

/* FORM STYLES */
.apply-form {
    max-width: 600px;
    margin-top: 2.5rem;
}

.form-group {
    margin-bottom: 1.75rem;
}

.form-group label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 0.6rem;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.875rem 1rem;
    font-family: var(--font-body);
    font-size: 1rem;
    background: var(--white);
    border: 1px solid var(--border);
    color: var(--text);
    transition: border-color 0.2s;
    border-radius: 6px;
    -webkit-appearance: none;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.form-group textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.6;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
    color: var(--text-tertiary);
    font-weight: 300;
}

.form-error {
    background: var(--accent-soft);
    border-left: 3px solid var(--accent);
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    color: var(--accent-hover);
    border-radius: 0 6px 6px 0;
}

.success-message {
    text-align: center;
    padding: 4rem 0;
}

/* FOOTER */
footer {
    padding: 2.5rem 2rem;
    text-align: center;
    border-top: 1px solid var(--border);
    margin-top: 2rem;
}

footer p {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    max-width: none;
    margin: 0;
    line-height: 1.7;
}

footer a { color: var(--text-secondary); text-decoration: none; }
footer a:hover { color: var(--accent); }

/* LESSON CONTENT (rendered markdown) */
.lesson-content h1 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 2rem;
    color: var(--text);
    margin: 2.5rem 0 1rem;
    letter-spacing: -0.03em;
    line-height: 1.2;
}

.lesson-content h2 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.5rem;
    color: var(--text);
    margin: 2.5rem 0 1rem;
    letter-spacing: -0.02em;
    line-height: 1.2;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
}

.lesson-content h2:first-child {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
}

.lesson-content h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--text);
    margin: 2rem 0 0.75rem;
}

.lesson-content p {
    margin-bottom: 1.25rem;
    max-width: none;
}

.lesson-content ul, .lesson-content ol {
    margin: 0 0 1.25rem 1.5rem;
    color: var(--text-secondary);
}

.lesson-content li {
    margin-bottom: 0.5rem;
    line-height: 1.7;
}

.lesson-content blockquote {
    border-left: 3px solid var(--accent);
    padding: 0.75rem 0 0.75rem 1.5rem;
    margin: 1.5rem 0;
}

.lesson-content blockquote p {
    font-style: italic;
    color: var(--text);
    margin: 0;
}

.lesson-content code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: var(--surface);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    color: var(--accent);
}

.lesson-content pre {
    background: var(--dark);
    color: #e0e0e0;
    padding: 1.25rem 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5rem 0;
    font-size: 0.9rem;
    line-height: 1.6;
}

.lesson-content pre code {
    background: none;
    padding: 0;
    color: inherit;
    border-radius: 0;
}

.lesson-content a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.lesson-content hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2rem 0;
}

.lesson-content strong { color: var(--text); }

.lesson-content img {
    max-width: 100%;
    border-radius: 8px;
    margin: 1.5rem 0;
}

/* COHORT HUB */
.week-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 2rem;
}

.week-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.week-card:hover {
    border-color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    text-decoration: none;
}

.week-card-info h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text);
    margin: 0 0 0.25rem;
    letter-spacing: -0.01em;
}

.week-card-info p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
}

.week-card-meta {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    flex-shrink: 0;
    margin-left: 1.5rem;
}

.week-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
}

.week-nav a {
    font-size: 0.9rem;
    color: var(--accent);
    text-decoration: none;
}

.week-nav a:hover { text-decoration: underline; }

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: 2rem;
}

.back-link:hover { color: var(--accent); text-decoration: none; }

/* BADGE */
.badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
}

.badge-published { background: #e8f5e9; color: #2e7d32; }
.badge-draft { background: var(--surface); color: var(--text-tertiary); }
.badge-completed { background: var(--surface); color: var(--text-tertiary); }
.badge-active { background: var(--accent-soft); color: var(--accent); }
`
