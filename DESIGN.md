# DESIGN.md — Prepwise (Premium UPSC SaaS)

## 0. Mission & Vibe
**Mission:** Replace “AI slop” with a premium, cinematic, high-taste interface that feels like a top-tier dev tool, but tailored for serious UPSC prep.
**Vibe:** Dark, restrained, editorial; motion with purpose; crisp typography; subtle glass; gold accent used sparingly for state/emphasis, not surface paint.

## 1. Design Dials (Taste-Skill style)
* **Design Variance:** High (avoid templated grids; use asymmetry + editorial rhythm).
* **Motion Intensity:** Medium-High (scroll-linked, springy micro-interactions, but honor prefers-reduced-motion).
* **Visual Density:** Medium (breathing room, clear hierarchy, no clutter).

## 2. Brand & Color System
* **Base theme:** Dark-first (`#0B0B0F` / `#0E0E12` backgrounds), with translucent surfaces (white/5–10) and soft inner glows.
* **Accent:** Amber/Gold (`#FFBF00`) used for primary actions, focus states, and key highlights; never flood surfaces.
* **Semantic accents (optional):** Radix-style roles for success/warning/error (teal/orange/red) kept minimal.
* **Borders:** Shadow-as-border pattern (`box-shadow: 0 0 0 1px rgba(255,255,255,0.06)`) instead of hard borders.
* **Gradients:** Very subtle radial/ambient gradients behind hero sections; avoid banding (use masks or noise overlays if needed).

## 3. Typography
* **Display font:** A distinctive, characterful sans or geometric (e.g., Sora, Space Grotesk, or similar) for headings to avoid generic “Inter-only” look.
* **Body font:** Refined, highly legible sans (e.g., Geist/Inter fallback) with `text-balance` on headings and `text-pretty` on body.
* **Scale:** Large, editorial headings (44–64px on desktop), comfortable body (16–18px), generous line-height.
* **Numerals:** Use `tabular-nums` for scores, timers, and analytics to prevent jitter.

## 4. Layout & Grid
* **Grid:** 12-column, 8px base spacing; content max-width ~1200–1280px; sections use asymmetric splits (e.g., 5/7) for editorial feel.
* **Alignment:** Deliberate optical alignment; avoid accidental centering; use baseline grids for text blocks.
* **Responsive:** Mobile-first; ensure 44px hit targets; no horizontal overflow; test ultra-wide by zooming out to 50%.

## 5. Motion & Animation System
* **Principle:** Motion must be motivated (clarify cause/effect or deliver deliberate delight).
* **Implementation preference:** CSS > Web Animations API > JS libs; use Framer Motion only where springs/state changes need it.
* **Compositor-friendly:** Animate only transform and opacity; avoid layout thrash (no animating width/height/top/left).
* **Easing:** Use snappy overshoot for primary actions (`cubic-bezier(.175,.885,.32,1.1)`), ease-out for entrances.
* **Scroll-linked:** Vertical progress line, section reveals, and parallax-light hero elements; provide reduced-motion variant.
* **Micro-interactions:** Button press scale ~0.98 with spring return; hover lifts with soft shadow; focus rings visible and unobscured.

## 6. Components & Patterns (Prepwise-specific)
* **Navbar:** Frosted glass, active-route underline, mobile hamburger with smooth drawer; profile dropdown with clear labels.
* **Hero (Home):** Ambient animated background (video or subtle shader), “Live Test” card auto-cycling; large headline, minimal subcopy, primary CTA with gold glow.
* **Features Grid:** Staggered reveal cards; hover-lift; border illumination on hover; avoid generic “3-column SaaS” symmetry.
* **How It Works:** Scroll-linked vertical timeline with gold line drawing; step indicators activate on scroll.
* **Pricing:** Free vs Premium; Premium card “pops” with scale, deeper shadow, and a small animated badge; avoid cluttered feature tables.
* **Auth Pages:** Centered forms, clean labels, show/hide password eye icon; 16px+ input font on mobile; optimistic validation.
* **Practice/Mock/PYQ Hubs:** Subject cards with progress bars; filter sidebar; empty states designed; start modal with mode (Learn/Exam) + question count.
* **Daily Current Affairs:** Dynamic feed; AI-generated MCQs; each item shows source, date, and quick-quiz CTA.
* **Test Interface:** Distraction-free; left question area; right question palette (color-coded statuses); confidence selectors; countdown timer.
* **Results:** Completion animation (gold check + confetti overlay), score counters, deep review with collapsible explanations and elimination tips.
* **Performance Dashboard:** Recharts line charts with staggered animation; weak/strong subject callouts; tooltips with tabular numbers.
* **Revision Queue:** Inbox-style list; quick “mark done” actions; spaced-repetition cues.
* **Admin Dashboard:** Secure, minimal, data-dense but clean; staged AI questions queue with approve/reject; bulk JSON import; audit logs table.
* **Toasts:** Pill-shaped, frosted, drop-in from top-center; polite aria-live announcements.

## 7. Accessibility & Performance
* **Respect** `prefers-reduced-motion`; provide pause/hide for loops >5s.
* **Focus management:** Visible focus rings, focus traps in modals, skip-to-content link.
* **Contrast:** Aim for APCA-level perceptual contrast; increase contrast on hover/active/focus.
* **Performance:** Virtualize long lists; preload critical fonts; subset fonts; avoid main-thread heavy work; use `will-change` sparingly.

## 8. Content & Microcopy
* **Tone:** Clear, active, second-person; avoid ambiguity; error messages guide the exit.
* **Numbers:** Use numerals for counts; separate numbers & units with a space (10 MB).
* **No dead ends:** Every screen offers a next step or recovery path.

## 9. SEO & Metadata
* Keep existing `sitemap.ts`, `robots.ts`, and global metadata; ensure dynamic titles reflect current context.
* Use `translate="no"` for brand/product/code tokens.

## 10. Delivery Checklist (Hard Pre-flight)
* Dual-mode dark/light parity (if light mode is added later).
* All states designed (empty, sparse, dense, error).
* Motion motivated and interruptible; no autoplay without controls.
* No generic “AI slop” patterns (avoid boilerplate hero + 3 feature cards + testimonial carousel).
