# Design System: Interview Prep Kit

## 1. Visual Theme & Atmosphere

Enterprise minimalist interface for serious interview preparation. The aesthetic is **Professional & Precise** — dark, sophisticated, and trustworthy. The dark canvas with light text creates intense focus. Clean sans-serif typography, subtle grid backdrops, and confident motion. The interface feels like a tool built by engineers for engineers—no filler, no ornament, just clarity.

**Density:** Balanced (5) — breathing room with purposeful information hierarchy  
**Variance:** Asymmetric (7) — split layouts, offset elements, deliberate composition  
**Motion:** Fluid CSS + Light Choreography (6) — spring physics, staggered reveals, purposeful animation

## 2. Color Palette & Roles

### Dark Mode (Default)

- **Canvas** (#09090b) — Deep charcoal, primary background
- **Surface** (#0f0f12) — Secondary surface, slightly lighter than canvas
- **Surface Raised** (#18181d) — Elevated container fill
- **Border** (#27272e) — Structural 1px lines, subtle dividers (zinc-800)
- **Border Strong** (#3f3f46) — Interactive element borders
- **Text Primary** (#fafafa) — Headlines and body text, off-white
- **Text Muted** (#a1a1a6) — Secondary descriptions, metadata
- **Text Faint** (#71717a) — Tertiary text, disabled states
- **Accent** (#f4f4f5) — High-contrast light gray for CTAs and highlights (zinc-100)
- **Accent Hover** (#e4e4e7) — Hover state (zinc-200)
- **Accent Foreground** (#09090b) — Text color on accent buttons
- **Must** (#ef4444) — Required fields, critical actions
- **Nice** (#22c55e) — Success, positive confirmations
- **Danger** (#ef4444) — Errors, destructive actions
- **Warning** (#eab308) — Cautionary states

**Design Intent:** Zinc palette signals precision and professionalism. Light gray accent creates high contrast against dark background—solid, not neon. Single accent color throughout (no blue, no purple). The dark canvas reduces eye strain during intense study sessions.

## 3. Typography Rules

- **Display/Headlines:** Geist (Bold, 700) — tracking-tight, controlled scale. Weight drives hierarchy, not size.
- **Subheading:** Geist (Semibold, 600) — text-lg to text-xl, leading-tight for focus
- **Body:** Geist (Regular, 400) — text-base, leading-relaxed (1.5), max 65ch width
- **Metadata/Labels:** Geist (Medium, 500) — text-xs to text-sm, uppercase tracking-wide
- **Monospace:** Geist Mono (Regular, 400) — For codes, technical copy, timestamps

**Banned:** Inter, Roboto, system fonts. No serif fonts in product UI.

## 4. Component Stylings

### Buttons (CTA)

- **Primary:** High-contrast solid button — white text on light gray background (bg-zinc-100, text-zinc-900)
- **Hover:** Slightly darker background (bg-zinc-200)
- **Active:** Scale down 2% (scale-0.97) for tactile feedback
- **State:** Smooth transition (120-160ms, cubic-bezier 0.23, 1, 0.32, 1)
- **Secondary:** Border-only, light text (text-zinc-300), zinc-800 border
- **No neon, no gradients, no glow effects.**

### Input Fields (Forms)

- **Structure:** Label above (text-sm font-medium), input below
- **Styling:** Border zinc-800, bg-zinc-950/50 (semi-transparent dark), rounded-md
- **Focus State:** Border brightens to zinc-400, background shifts to zinc-900, soft glow (rgba(244,244,245,0.2))
- **Transition:** Smooth 200ms with strong easing curve
- **Error:** Red border (error-red), error message below

### Cards & Containers

- **Background:** Solid zinc colors (no gradients, no blur)
- **Borders:** Hairline zinc-800 borders for definition
- **Spacing:** Generous internal padding (p-5 to p-8)
- **No double-bezel, no nested containers.** Direct, clean card styling.

### Loading States

- Skeletal loaders matching exact layout dimensions
- Gentle shimmer animation (no spinning spinners)

### Empty States

Composed, clear messaging (e.g., "No kits yet — create your first one using the form on the right")

## 5. Layout Principles

- **Grid System:** CSS Grid over Flexbox. Max-width 1400px centered.
- **Split Screen:** 50/50 desktop, stacked single-column on mobile (< 1024px)
- **Responsive Collapse:** All multi-column layouts become w-full px-4 on mobile. No horizontal scroll.
- **Macro-Whitespace:** py-16+ for section spacing. Content breathes.
- **Micro-Whitespace:** gap-3 to gap-6 between elements. Intentional grouping.
- **Min-height:** Always min-h-[100dvh], never h-screen (iOS Safari fix)

## 6. Motion & Interaction

- **Entry Animations:** Slide-in from left (600ms), slide-in from right (600ms), fade-up stagger (500ms + delays)
- **Easing:** Strong cubic-bezier(0.23, 1, 0.32, 1) for all interactive motion—no sluggish defaults
- **Button Feedback:** Active state scales to 0.97 over 120ms
- **Input Focus:** Border and shadow transitions over 200ms
- **No perpetual loops.** Animation serves purpose only.
- **Reduced motion:** Respects prefers-reduced-motion; disables all transforms except fades.

## 7. Anti-Patterns (Strictly Banned)

- **NO** blue accent colors (enterprise zinc only)
- **NO** neon glows, harsh shadows, or gradient overlays
- **NO** centered hero sections
- **NO** generic "3 equal cards" feature rows
- **NO** Inter, Roboto, or system fonts
- **NO** "Scroll to explore" or filler UI copy
- **NO** custom mouse cursors
- **NO** emoji anywhere
- **NO** overlapping text and images
- **NO** h-screen (always min-h-[100dvh])
- **NO** linear easing on transitions

---

This design encodes precision, trust, and professional care. Every detail serves the user's focused preparation.

## Animation Keyframes

```css
@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Motion Durations

- Entry animations: 500-600ms
- Button feedback: 120ms
- Input focus: 200ms
- Stagger delays: 50-100ms between items
