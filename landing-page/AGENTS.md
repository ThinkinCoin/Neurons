# Repository Guidelines

## Project Structure & Module Organization

This repository contains a standalone Next.js landing page for `$Neurons`.

- `app/page.tsx` contains the single-page public experience and inline React components.
- `app/layout.tsx` defines document metadata and shared layout.
- `app/globals.css` holds global styles, CSS variables, responsive rules, and component classes.
- `public/` stores static assets served at the site root, including `neurons-network-hero.png` and favicon files.
- `public/assets/` stores brand and logo assets.
- `next.config.mjs`, `tsconfig.json`, and `vercel.json` configure Next.js, TypeScript, and deployment.

There is no dedicated test directory at this time.

## Build, Test, and Development Commands

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the production Next.js app:

```bash
npm run build
```

Serve a previously built app:

```bash
npm run start
```

No `npm test` or lint script is currently configured. Use `npm run build` as the minimum validation step before submitting changes.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep page-specific components close to `app/page.tsx` unless the project grows enough to justify shared modules. Follow the existing JSX style: double quotes for attributes, descriptive class names, and accessible labels for navigation, icons, and external links.

CSS is plain global CSS. Reuse variables in `:root`, keep class names semantic such as `.hero-copy` or `.proof-section`, and place responsive behavior in `app/globals.css`. Prefer static assets from `public/` instead of remote image dependencies.

## Testing Guidelines

There is no automated test framework configured. For visual or layout changes, verify the page manually at `http://localhost:3000` after `npm run dev`, including desktop and mobile widths. Before opening a pull request, run:

```bash
npm run build
```

If tests are added later, use colocated names such as `ComponentName.test.tsx` or a top-level `tests/` directory, and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Recent history uses conventional prefixes such as `feat:`, `fix:`, and `refactor:`. Keep messages short and action-oriented, for example `fix: adjust mobile hero spacing`.

Pull requests should include a concise description, validation commands run, and screenshots for visual changes. Link related issues when available. Do not include generated build output or archives unless they are intentionally part of the release process.

## Deployment Notes

The README documents Vercel deployment with the root directory set to `landing-page`, Next.js as the framework preset, and no required environment variables. Keep those assumptions accurate when changing configuration.
