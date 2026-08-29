# Design Rules Reference

General frontend design principles for a clean, minimalist look with tasteful glassmorphism — not "vibe-coded." Hand this to any dev/AI tool for consistent visual output.

## Typography
- 1–3 fonts max per project. Pick one pairing and stick to it.
- Safe defaults: Helvetica/Arial, system-ui, or a clean Google Font. Avoid overused fonts applied without intention (Inter/Roboto everywhere with no real hierarchy is a tell — vary weight/size deliberately instead).
- Type scale: consistent ratio (1.25x or 1.5x) across sizes — no arbitrary px values.
- Line height: ~1.4–1.6 body, ~1.1–1.2 large headings.
- Line length: cap body text at ~60–75 characters per line.

## Color
- Near-white/near-black neutrals, not pure #FFF/#000. Keep chroma < 0.02 (OKLCH) for neutrals.
- Pick one temperature (warm/cool/neutral), stay consistent.
- 0–2 accent colors max, same lightness/chroma in OKLCH, varying only hue.
- Ban gradient backgrounds (especially purple/blue "AI app" gradients) as a default fill — use flat, well-chosen surface colors instead. Gradients only as a deliberate, sparing accent, never the whole background.

## Glassmorphism (used sparingly, on key surfaces only)
- Apply glass to nav bars, modals, and select cards — not everywhere. Most surfaces stay solid/flat.
- `backdrop-filter: blur(12–20px)` with a low-opacity surface fill (e.g. background: oklch(1 0 0 / 0.6) light, or dark equivalent).
- Always pair glass with a 1px hairline border (subtle, low-contrast) to define the edge — blur alone reads muddy.
- Avoid stacking glass-on-glass (nested blurred panels) — one layer of glass per view region.
- No colored/rainbow tints inside glass panels; keep them neutral.

## Layout & Spacing
- Spacing scale (4/8px base grid) — never arbitrary margins/padding.
- Flexbox/grid with `gap`, not manual margins between siblings.
- Clear hierarchy via size/weight/spacing before color.
- Avoid center-everything layouts — use left-aligned or asymmetric layouts as the default; center only short, isolated content (hero headline, empty state).
- Whitespace is intentional, not unfinished.

## Components
- Consistent corner radius scale (4/8/16px) — don't mix arbitrary radii.
- Ban the generic "rounded card + colored left-border accent" pattern.
- Shadows: 2–3 levels max (resting, hover, elevated) — never a shadow on every element. With glass surfaces, a shadow is often unnecessary; the blur + hairline border does the work.
- Hit targets: minimum 44×44px on touch/mobile.
- Design all states: default, hover, active, focus, disabled.

## Imagery & Icons
- Never hand-draw complex imagery in SVG/CSS. Use real photography/illustration or clearly-labeled placeholders (striped box + monospace caption).
- One consistent icon set/style (stroke width, corner style, filled vs outline).
- No emoji as icons or bullets.

## Content
- No filler — cut placeholder copy and empty-feeling sections rather than padding them.
- Write real, specific copy, even in drafts.

## Anti-patterns to avoid (the "vibe-coded" tells)
- Purple/blue gradient backgrounds
- Emoji used as icons
- Rounded cards with a colored left-border accent
- Fonts used with no real hierarchy (default sizes/weights everywhere)
- Center-everything layouts
- Drop shadows on every element
- Glass effects applied to every surface instead of a few key ones

## Accessibility baseline
- Text contrast: 4.5:1 minimum body, 3:1 large text (check contrast carefully behind glass/blur surfaces — busy backgrounds under blur can still fail contrast).
- Don't rely on color alone to convey state — pair with icon, text, or pattern.
- Visible focus states for keyboard navigation.
