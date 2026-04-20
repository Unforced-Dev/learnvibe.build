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

.nav-user {
    font-family: var(--font-mono);
    font-size: 0.8rem !important;
    padding: 0.4rem 1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text) !important;
    transition: border-color 0.2s, background 0.2s;
}

.nav-user:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
}

@media (max-width: 600px) {
    .nav { padding: 1rem 1.5rem; }
    .nav-links { gap: 1.25rem; }
    .nav-links li.nav-hide-mobile { display: none; }
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

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="url"],
.form-group input[type="number"],
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

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus,
.form-group input[type="password"]:focus,
.form-group input[type="url"]:focus,
.form-group input[type="number"]:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.form-group input[type="radio"],
.form-group input[type="checkbox"] {
    width: auto;
    accent-color: var(--accent);
    cursor: pointer;
}

.form-group input[type="radio"] {
    width: 18px;
    height: 18px;
}

.form-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
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

.code-block-wrap {
    position: relative;
    margin: 1.5rem 0;
}
.code-block-wrap > pre { margin: 0; }
.code-copy-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.3rem 0.7rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: #e0e0e0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
    z-index: 1;
}
.code-block-wrap:hover .code-copy-btn,
.code-copy-btn:focus { opacity: 1; }
.code-copy-btn:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
.code-copy-btn.copied { background: var(--accent); color: #fff; border-color: var(--accent); opacity: 1; }
@media (hover: none) {
    .code-copy-btn { opacity: 1; }
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
.badge-pending { background: #fff3e0; color: #e65100; }

/* ADMIN */
.admin-stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1.5rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
}

.admin-stat-card:hover {
    border-color: var(--accent);
    text-decoration: none;
}

.admin-stat-number {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.03em;
}

.admin-stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.admin-action-btn {
    display: inline-block;
    padding: 0.6rem 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--text);
    text-decoration: none;
    transition: border-color 0.2s, background 0.2s;
}

.admin-action-btn:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    text-decoration: none;
}

.admin-app-card {
    display: block;
    padding: 1rem 1.25rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
}

.admin-app-card:hover {
    border-color: var(--accent);
    text-decoration: none;
}

.admin-detail-section {
    margin-top: 2rem;
}

.admin-detail-section h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
    margin-bottom: 0.5rem;
}

.admin-detail-section p {
    color: var(--text-secondary);
    line-height: 1.7;
}

/* COMMUNITY HUB */
.community-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    margin-top: 2rem;
}

.community-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.75rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.community-card:hover {
    border-color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    text-decoration: none;
}

.community-card h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.15rem;
    color: var(--text);
    margin: 0;
    letter-spacing: -0.01em;
}

.community-card p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
}

.community-card-count {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.25rem;
}

@media (max-width: 550px) {
    .community-grid { grid-template-columns: 1fr; }
}

/* MEMBER DIRECTORY */
.member-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
    margin-top: 2rem;
}

.member-card {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
}

.member-card:hover {
    border-color: var(--accent);
    text-decoration: none;
}

.member-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.1rem;
    flex-shrink: 0;
}

.member-card-info h3, .member-card-info h4 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
    margin: 0 0 0.15rem;
    letter-spacing: -0.01em;
}

.member-card-info p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.member-card-meta {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: 0.35rem;
}

/* PROFILE PAGE */
.profile-header {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    margin-bottom: 2rem;
}

.profile-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.75rem;
    flex-shrink: 0;
}

.profile-info h2 {
    margin-bottom: 0.25rem;
}

.profile-meta {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-tertiary);
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}

.profile-links {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
}

.profile-links a {
    font-size: 0.85rem;
    color: var(--accent);
    text-decoration: none;
}

.profile-links a:hover { text-decoration: underline; }

/* PROJECT CARDS */
.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
    margin-top: 2rem;
}

.project-card {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.project-card:hover {
    border-color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    text-decoration: none;
}

.project-card h3, .project-card h4 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text);
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
}

.project-card p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 0.75rem;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: none;
}

.project-card-footer {
    margin-top: auto;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.project-card-author {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.project-card-links {
    display: flex;
    gap: 0.75rem;
}

.project-card-links a, .project-card-links span {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--accent);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.project-card-links a:hover { text-decoration: underline; }

/* DISCUSSIONS */
.discussion-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1.5rem;
}

.discussion-item {
    display: block;
    padding: 1.25rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
}

.discussion-item:hover {
    border-color: var(--accent);
    text-decoration: none;
}

.discussion-item.pinned {
    border-left: 3px solid var(--accent);
}

.discussion-item h3, .discussion-item h4 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
    margin: 0 0 0.35rem;
    letter-spacing: -0.01em;
}

.discussion-item p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: none;
}

.discussion-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

.discussion-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}

.discussion-tab {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    text-decoration: none;
    transition: background 0.2s;
}

.discussion-tab.active {
    background: var(--accent);
    color: var(--white);
}

.discussion-tab:not(.active) {
    background: var(--surface);
    color: var(--text-secondary);
}

.discussion-tab:hover { text-decoration: none; }

/* COMMENTS */
.comment-list {
    margin-top: 2rem;
}

.comment {
    padding: 1.25rem 0;
    border-bottom: 1px solid var(--border);
}

.comment:last-child { border-bottom: none; }

.comment.reply {
    margin-left: 2rem;
    padding-left: 1rem;
    border-left: 2px solid var(--border);
    border-bottom: none;
}

.comment-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
}

.comment-author {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text);
}

.comment-time {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

.comment-body {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.7;
}

.comment-body p { margin-bottom: 0.75rem; max-width: none; }
.comment-body p:last-child { margin-bottom: 0; }

.comment-actions {
    margin-top: 0.5rem;
}

.comment-actions a {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    text-decoration: none;
}

.comment-actions a:hover { color: var(--accent); }

/* PROGRESS BAR */
.progress-bar {
    width: 100%;
    height: 6px;
    background: var(--surface);
    border-radius: 3px;
    overflow: hidden;
    margin: 1rem 0 0.5rem;
}

.progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.3s ease;
}

.progress-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    display: flex;
    justify-content: space-between;
}

.lesson-check {
    color: var(--accent);
    font-size: 0.9rem;
}

/* ACTIVITY FEED */
.activity-feed {
    margin-top: 1.5rem;
}

.activity-item {
    display: flex;
    gap: 1rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid var(--border);
    align-items: flex-start;
    text-decoration: none;
    color: inherit;
}

.activity-item:last-child { border-bottom: none; }

.activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    flex-shrink: 0;
}

.activity-content {
    flex: 1;
    min-width: 0;
}

.activity-content p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
}

.activity-content a { color: var(--text); font-weight: 500; }

.activity-time {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: 0.2rem;
}

/* MARKDOWN CONTENT (reused for discussions, comments, projects) */
.md-content h1, .md-content h2, .md-content h3 { font-family: var(--font-display); color: var(--text); }
.md-content h2 { font-size: 1.35rem; margin: 1.5rem 0 0.75rem; border-top: none; padding-top: 0; }
.md-content h3 { font-size: 1.1rem; margin: 1.25rem 0 0.5rem; }
.md-content p { margin-bottom: 1rem; max-width: none; }
.md-content ul, .md-content ol { margin: 0 0 1rem 1.5rem; color: var(--text-secondary); }
.md-content li { margin-bottom: 0.35rem; line-height: 1.7; }
.md-content blockquote { border-left: 3px solid var(--accent); padding: 0.5rem 0 0.5rem 1.25rem; margin: 1rem 0; }
.md-content blockquote p { font-style: italic; color: var(--text); margin: 0; }
.md-content code { font-family: var(--font-mono); font-size: 0.9em; background: var(--surface); padding: 0.15em 0.4em; border-radius: 4px; color: var(--accent); }
.md-content pre { background: var(--dark); color: #e0e0e0; padding: 1rem 1.25rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; font-size: 0.9rem; }
.md-content pre code { background: none; padding: 0; color: inherit; }
.md-content a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.md-content img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }

/* FULL-WIDTH MAIN (homepage) */
main.main-full {
    max-width: none;
    padding: 0;
}

/* HERO */
.hero {
    text-align: center;
    padding: 7rem 2rem 5rem;
    max-width: 900px;
    margin: 0 auto;
}

.hero-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    line-height: 1.1;
    letter-spacing: -0.04em;
    color: var(--text);
    margin-bottom: 1.5rem;
}

.hero-title .accent { color: var(--accent); }

.hero-subtitle {
    font-size: 1.2rem;
    font-weight: 300;
    color: var(--text-secondary);
    max-width: 560px;
    margin: 0 auto 2.5rem;
    line-height: 1.7;
}

.hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--accent);
    color: var(--white);
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 500;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
}

.hero-cta:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    text-decoration: none;
}

.hero-cta svg { transition: transform 0.2s; }
.hero-cta:hover svg { transform: translateX(3px); }

.hero-meta {
    margin-top: 2rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

.hero-meta .sep {
    margin: 0 0.6rem;
    opacity: 0.4;
}

@media (max-width: 600px) {
    .hero { padding: 4rem 1.5rem 3rem; }
}

/* HOMEPAGE SECTIONS */
.hp-section {
    max-width: 1000px;
    margin: 0 auto;
    padding: 5rem 2rem;
}

.hp-section-narrow { max-width: 720px; }

.hp-divider {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 2rem;
}

.hp-divider hr {
    border: none;
    border-top: 1px solid var(--border);
}

.hp-section h2 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    color: var(--text);
    margin-bottom: 1.25rem;
    letter-spacing: -0.03em;
    line-height: 1.15;
}

.hp-section .lead {
    font-size: 1.1rem;
    font-weight: 300;
    line-height: 1.8;
    color: var(--text);
    max-width: 600px;
    margin-bottom: 1.25rem;
}

.hp-section p {
    color: var(--text-secondary);
    margin-bottom: 1.25rem;
    max-width: 600px;
}

/* JOURNEY / SIX C'S */
.journey-band {
    background: var(--surface);
}

.journey-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-top: 2.5rem;
}

.journey-step {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.5rem;
}

.journey-step-num {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--accent);
    letter-spacing: 0.03em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
}

.journey-step-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--text);
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
}

.journey-step p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
    max-width: none;
}

@media (max-width: 800px) {
    .journey-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 500px) {
    .journey-grid { grid-template-columns: 1fr; }
}

/* COHORT CARD */
.cohort-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2.5rem;
    margin-top: 2rem;
}

.cohort-card h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.4rem;
    letter-spacing: -0.02em;
    margin-bottom: 0.35rem;
}

.cohort-detail {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-tertiary);
    margin-bottom: 1.25rem;
}

.cohort-card > p {
    max-width: none;
    margin-bottom: 1rem;
}

.cohort-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    padding: 0.3rem 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
}

.badge-open {
    background: var(--accent-soft);
    color: var(--accent);
}

.cohort-weeks {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin: 1.5rem 0;
}

.cohort-week {
    padding: 0.75rem 1rem;
    background: var(--surface);
    border-radius: 6px;
    font-size: 0.85rem;
}

.cohort-week strong {
    display: block;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.15rem;
}

.cohort-week span {
    color: var(--text-tertiary);
    font-size: 0.8rem;
}

@media (max-width: 600px) {
    .cohort-weeks { grid-template-columns: repeat(2, 1fr); }
}

/* OUTCOMES */
.outcomes-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-top: 2rem;
}

.outcome-stat {
    text-align: center;
    padding: 2rem 1rem;
}

.outcome-number {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 2.5rem;
    color: var(--accent);
    letter-spacing: -0.03em;
}

.outcome-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

.testimonial {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.75rem;
    margin-top: 2rem;
}

.testimonial blockquote {
    font-size: 1.05rem;
    font-style: italic;
    color: var(--text);
    line-height: 1.7;
    margin: 0 0 1rem;
    border: none;
    padding: 0;
}

.testimonial-author {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

@media (max-width: 600px) {
    .outcomes-grid { grid-template-columns: 1fr; gap: 0.5rem; }
    .outcome-stat { padding: 1rem; }
}

/* AUDIENCE */
.audience-list { margin-top: 2rem; }

.audience-item {
    padding: 1rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 1.5rem;
    align-items: baseline;
}

.audience-item:last-child { border-bottom: none; }

.audience-role {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    min-width: 100px;
    flex-shrink: 0;
}

.audience-item p {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary);
    max-width: none;
}

@media (max-width: 500px) {
    .audience-item { flex-direction: column; gap: 0.25rem; }
}

/* GUIDES */
.guides-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-top: 2rem;
}

.guide {
    padding: 1.5rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 10px;
}

.guide-name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text);
    margin-bottom: 0.2rem;
    letter-spacing: -0.01em;
}

.guide-role {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    margin-bottom: 0;
}

.guide-bio {
    font-size: 0.9rem;
    margin-top: 0.75rem;
    margin-bottom: 0;
    color: var(--text-secondary);
    line-height: 1.6;
}

.guide a { color: var(--accent); text-decoration: none; }
.guide a:hover { text-decoration: underline; }

@media (max-width: 600px) {
    .guides-grid { grid-template-columns: 1fr; }
}

/* FAQ */
.faq-list { margin-top: 2rem; }

.faq-item {
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--border);
}

.faq-item:last-child { border-bottom: none; }

.faq-q {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--text);
    margin-bottom: 0.5rem;
    letter-spacing: -0.01em;
}

.faq-a {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0;
    max-width: none;
}

/* CTA SECTION */
.cta-section {
    background: var(--dark);
    padding: 6rem 2rem;
    text-align: center;
}

.cta-content {
    max-width: 520px;
    margin: 0 auto;
}

.cta-section h2 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.75rem, 4vw, 2.25rem);
    color: var(--white);
    margin-bottom: 1rem;
    letter-spacing: -0.03em;
}

.cta-section p {
    color: var(--dark-text);
    font-size: 1.05rem;
    line-height: 1.7;
    max-width: none;
    margin-bottom: 2rem;
}

.cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--accent);
    color: var(--white);
    font-family: var(--font-body);
    font-size: 1.05rem;
    font-weight: 500;
    padding: 1rem 2.25rem;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
}

.cta-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    text-decoration: none;
}

.cta-aside {
    margin-top: 2rem;
    font-size: 0.9rem;
    color: #666;
}

.cta-aside a {
    color: var(--accent);
    text-decoration: none;
}

.cta-aside a:hover { text-decoration: underline; }

/* EMPTY STATE */
.empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-tertiary);
}

.empty-state p {
    max-width: none;
    color: var(--text-tertiary);
    margin: 0 auto 1rem;
}

/* API KEY MANAGEMENT */
.api-key-list {
    margin-top: 1.5rem;
}

.api-key-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 0.75rem;
    background: var(--white);
    gap: 1rem;
    flex-wrap: wrap;
}

.api-key-name {
    font-weight: 600;
    font-size: 0.95rem;
}

.api-key-value {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-tertiary);
    background: var(--surface);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    word-break: break-all;
}

.api-key-meta {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .nav { padding: 1rem; }
    .nav-links { gap: 0.75rem; font-size: 0.85rem; }
    .page-section { padding: 2rem 1rem; }
    .community-grid { grid-template-columns: 1fr; }
    .project-grid { grid-template-columns: 1fr; }
    .member-grid { grid-template-columns: 1fr; }
    .profile-header { flex-direction: column; align-items: center; text-align: center; }
    .profile-meta { justify-content: center; }
    .profile-links { justify-content: center; }
    .week-grid { gap: 0.75rem; }
    .activity-item { gap: 0.75rem; }
}

@media (max-width: 480px) {
    body { font-size: 16px; }
    .nav { flex-direction: column; gap: 0.75rem; }
    .nav-links { gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
    h2 { font-size: 1.5rem; }
    .community-card { padding: 1.25rem; }
    .discussion-item { padding: 1rem; }
    .project-card { padding: 1.25rem; }
}
`
