# Zyphorix Guard Marketing Brand Spec

## Marketing direction

Command-center cybersecurity: an operational, evidence-led landing page that turns the product dashboard into the primary proof point.

## Core assets

- Logo: `/public/zyphorix-logo.png`
- Product demonstration banner: `/public/zyphorix-command-center.png`
- Demonstration usage: `components/marketing/ProductShowcase.tsx`

## Color tokens

- Deep navy: `#05070d`
- Panel navy: `#0b1220`
- Electric blue: `#3b82f6`
- Cyan: `#22d3ee`
- Violet: `#8b5cf6`
- Success: `#34d399`
- Threat: `#f87171`
- Primary text: `#f8fafc`
- Secondary text: `#a8b7cc`

## Layout rules

- 8px spacing rhythm.
- Hero uses a split command-center composition on desktop and a stacked composition below 900px.
- Product screenshot is presented as a labeled, accessible demonstration banner—not as an unreadable background.
- Panels use 16–24px radii, 1px blue-tinted borders, and layered navy glass surfaces.

## Motion

- Hero content uses short staggered GPU-safe transforms and opacity.
- Telemetry bars and live indicator are decorative and stop under `prefers-reduced-motion`.
- Interactive cards retain visible focus states and short hover transitions.
