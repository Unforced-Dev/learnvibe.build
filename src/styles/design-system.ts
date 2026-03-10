export const DESIGN_SYSTEM_CSS = `
:root {
    --void: #08080a;
    --ink: #0f0f12;
    --charcoal: #1a1a1f;
    --graphite: #2a2a30;
    --parchment: #f7f5f0;
    --cream: #ebe7df;
    --bone: #d8d3c8;
    --stone: #9a958a;
    --ember: #c2512a;
    --ember-dim: #8a3a1f;
    --ember-glow: rgba(194, 81, 42, 0.08);
    --sage: #4a5f4a;

    --font-display: 'Cormorant', serif;
    --font-body: 'Inter', sans-serif;
    --font-mono: 'IBM Plex Mono', monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
    font-family: var(--font-body);
    background: var(--parchment);
    color: var(--graphite);
    line-height: 1.75;
    font-size: 17px;
    font-weight: 400;
}

body::before {
    content: '';
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    opacity: 0.12;
    z-index: 10000;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* NAV */
nav {
    background: var(--parchment);
    border-bottom: 1px solid var(--bone);
    padding: 1.5rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
}

nav::before {
    content: '';
    position: absolute;
    bottom: 0; left: 50%;
    transform: translateX(-50%);
    width: 60px; height: 1px;
    background: var(--ember);
}

nav ul {
    display: flex;
    justify-content: center;
    gap: 3rem;
    list-style: none;
    max-width: 900px;
    margin: 0 auto;
    flex-wrap: wrap;
}

nav a {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 400;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--graphite);
    text-decoration: none;
    padding: 0.5rem 0;
    position: relative;
    transition: color 0.3s ease;
}

nav a::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0;
    width: 0; height: 1px;
    background: var(--ember);
    transition: width 0.4s ease;
}

nav a:hover { color: var(--ember); }
nav a:hover::after { width: 100%; }

/* MAIN CONTENT */
main {
    max-width: 820px;
    margin: 0 auto;
    padding: 0 2rem;
    position: relative;
}

main::before {
    content: '';
    position: absolute;
    left: -60px; top: 0; bottom: 0;
    width: 1px;
    background: repeating-linear-gradient(
        180deg,
        var(--bone) 0px, var(--bone) 4px,
        transparent 4px, transparent 20px
    );
    opacity: 0.5;
}

@media (max-width: 1000px) { main::before { display: none; } }

section {
    padding: 6rem 0;
    border-bottom: 1px solid var(--bone);
    position: relative;
}

section:last-of-type { border-bottom: none; }

.section-mark {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--stone);
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.section-mark::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--bone);
    max-width: 100px;
}

h2 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(2rem, 4.5vw, 2.75rem);
    color: var(--charcoal);
    margin-bottom: 1.75rem;
    letter-spacing: -0.01em;
    line-height: 1.2;
}

h3 {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 1.5rem;
    color: var(--graphite);
    margin: 3rem 0 1.25rem;
    letter-spacing: -0.01em;
}

p {
    color: var(--graphite);
    margin-bottom: 1.5rem;
    max-width: 65ch;
}

.lead {
    font-size: 1.1rem;
    font-weight: 300;
    color: var(--charcoal);
    line-height: 1.9;
}

em { font-style: italic; color: var(--ember-dim); }

a { color: var(--ember); text-decoration: none; }
a:hover { text-decoration: underline; }

/* FOOTER */
footer {
    background: var(--void);
    padding: 3rem 2rem;
    text-align: center;
}

footer p {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    color: var(--graphite);
    max-width: none;
    margin: 0;
}

footer a { color: var(--stone); text-decoration: none; transition: color 0.3s ease; }
footer a:hover { color: var(--ember); }

/* APPLY BUTTON */
.apply-btn {
    display: inline-block;
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    background: var(--ember);
    color: var(--parchment);
    border: none;
    padding: 1rem 2.5rem;
    cursor: pointer;
    letter-spacing: 0.02em;
    text-decoration: none;
    transition: background-color 0.3s ease;
    margin-top: 2rem;
}

.apply-btn:hover {
    background: var(--ember-dim);
    text-decoration: none;
}

/* FORM STYLES */
.apply-form {
    max-width: 600px;
    margin-top: 3rem;
}

.form-group {
    margin-bottom: 2rem;
}

.form-group label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--stone);
    margin-bottom: 0.75rem;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.875rem 1rem;
    font-family: var(--font-body);
    font-size: 1rem;
    background: var(--cream);
    border: 1px solid var(--bone);
    color: var(--charcoal);
    transition: border-color 0.3s ease;
    border-radius: 0;
    -webkit-appearance: none;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--ember);
}

.form-group textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.6;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
    color: var(--stone);
    font-weight: 300;
}

.form-error {
    background: rgba(194, 81, 42, 0.08);
    border-left: 3px solid var(--ember);
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    color: var(--ember-dim);
}

.success-message {
    text-align: center;
    padding: 4rem 0;
}
`
