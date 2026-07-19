# janackeh.me — Personal Brand Site

The personal portfolio site for **Janackeh Blackwell** — AI-enabled Support Ops / CX workflow builder.

Live at **[janackeh.me](https://janackeh.me)**.

## What's here

- `index.html` — homepage: hero, selected work, about, journey, learning & certifications roadmap, skills, contact
- `demo/` — the [call-note drafting demo](https://janackeh.me/demo) (also available as a [standalone repo](https://github.com/janackeh/call-note-drafting-demo))
- `case-study/` — the [case study write-up](https://janackeh.me/case-study/)
- `base.css` / `style.css` / `app.js` — styles and scroll-reveal behavior
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` — brand icons

## Features

- Custom rose-gold design system, Apple-clean aesthetic, frosted sticky header
- Light/dark mode (follows system preference, in-memory toggle)
- Scroll-reveal animations (progressive enhancement; content remains accessible)
- Fully static — no backend, no build step, no tracking

## Run locally

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Deploy

The site is hosted on **Cloudflare Workers (static assets)**. To deploy:

1. Zip the repo contents (with `demo/` and `case-study/` subdirectories intact).
2. Cloudflare dashboard → Workers & Pages → the `index` worker → **Create new deployment**.
3. Drag the folder in → Deploy.
4. Hard-refresh janackeh.me.

## Tech

- Vanilla HTML, CSS, JavaScript
- [Satoshi](https://www.fontshare.com/fonts/satoshi) (Fontshare) + JetBrains Mono

## Author

**Janackeh Blackwell** — [janackeh.me](https://janackeh.me) · [LinkedIn](https://www.linkedin.com/in/janackeh/) · [GitHub](https://github.com/janackeh)

## License

[MIT](./LICENSE) — the design and code are free to learn from. Personal content and case-study material are © Janackeh Blackwell.
