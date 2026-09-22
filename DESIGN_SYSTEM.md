# Design System: Interview Prep Kit

## 1. Visual Theme & Atmosphere
A clean, professional interface for serious interview preparation. The aesthetic is **Modern Minimalist with Depth** — sharp, purposeful, and trust-forward like a well-engineered product. Generous whitespace, deliberate typography hierarchy, and precise micro-interactions. The interface feels like a tool built by craftspeople, not a template.

**Density:** Balanced (5) — breathing room with information hierarchy  
**Variance:** Asymmetric (7) — split layouts, offset elements, intentional composition  
**Motion:** Fluid CSS + Light Choreography (5) — smooth spring physics, staggered reveals, purposeful animation

## 2. Color Palette & Roles

### Light Theme
- **Canvas** (#FFFFFF) — Primary background, pure white
- **Surface** (#F9FAFB) — Secondary background, off-white for contrast
- **Border** (#E5E7EB) — Structural 1px lines, subtle dividers
- **Text Primary** (#111827) — Headlines and body text, deep charcoal
- **Text Secondary** (#6B7280) — Descriptions, metadata, secondary copy
- **Text Tertiary** (#9CA3AF) — Faint text, disabled states
- **Accent** (#2563EB) — Single accent for CTAs, focus, highlights (Electric Blue, 60% saturation)
- **Accent Hover** (#1D4ED8) — Darker blue for interactive states
- **Accent Soft** (#DBEAFE) — Soft background for accent contexts
- **Success** (#10B981) — Confirmations, positive states
- **Warning** (#F59E0B) — Cautionary states
- **Error** (#EF4444) — Errors, destructive actions

### Dark Theme
- **Canvas** (#0F1419) — Primary background, deep charcoal
- **Surface** (#1A202C) — Secondary background, slightly lighter
- **Border** (#2D3748) — Structural lines, subtle on dark
- **Text Primary** (#F3F4F6) — Headlines and body text, light gray
- **Text Secondary** (#D1D5DB) — Descriptions, secondary copy
- **Text Tertiary** (#9CA3AF) — Faint text, disabled states
- **Accent** (#3B82F6) — Electric Blue, slightly brighter for dark mode
- **Accent Hover** (#60A5FA) — Lighter blue for interactive states
- **Accent Soft** (#1E3A8A) — Deep blue background
- **Success** (#34D399) — Confirmations, positive states
- **Warning** (#FBBF24) — Cautionary states
- **Error** (#F87171) — Errors, destructive actions

### Intent
A single electric blue accent signals "this is a tool built with precision." Neutral blacks/whites with high contrast create clarity and trust. No warmth, no purple, no AI defaults. One color system that works across both themes.

## 3. Typography Rules

- **Display/Headlines:** Geist (Bold, 700) — tracking-tight, controlled scale. Weight drives hierarchy, not size.
- **Subheading:** Geist (Semibold, 600) — text-lg to text-xl, leading-tight for focus
- **Body:** Geist (Regular, 400) — text-base, leading-relaxed (1.5), max 65ch width
- **Metadata/Labels:** Geist (Medium, 500) — text-xs to text-sm, uppercase tracking-wide
- **Monospace:** Geist Mono (Regular, 400) — For codes, technical copy, timestamps

**Banned:** Inter (unless explicitly requested), generic serifs, oversaturated gradients on text, excessive size scaling

## 4. Component Stylings

### Buttons (CTA)
- **Primary:** Blue fill (#2563EB), white text, full-rounded (rounded-full), px-6 py-3
- **State:** On hover, glow subtly (shadow-[0_0_20px_rgba(37,99,235,0.3)]). On active, scale down 2% (scale-98)
- **Secondary:** Border only, blue text, same padding/radius
- **Icon Wrapper:** If button has trailing icon, nest in micro-circle (w-6 h-6 rounded-full), positioned flush right

### Cards / Nested Containers
- **Outer Shell:** Wrapper with bg-surface, border-1 border-border, rounded-2xl, p-0.5, subtle inner shadow
- **Inner Core:** Content container with bg-canvas, rounded-[calc(2rem-2px)], generous padding (p-6 to p-8)
- **Hover:** Shadow deepens, no scale (avoid layout shift)

### Input Fields (Forms)
- **Structure:** Label above (text-sm font-medium), input below with border-border, rounded-lg, px-4 py-3
- **Focus:** Border shifts to blue, soft shadow glow (shadow-[0_0_0_3px_rgba(37,99,235,0.1)])
- **Error:** Border red, error message below in text-xs text-error

### Loading States
- Skeletal loaders matching exact layout. Gentle shimmer (no spinning spinners)

### Empty States
- Composed, thoughtful empty states — never just "No data yet"

## 5. Layout Principles

- **Grid System:** CSS Grid over Flexbox percentage math. Max-width-7xl centered.
- **Hero Section:** Split layout — text on left (w-1/2), interactive on right (w-1/2). Mobile: stacked single column.
- **Macro-Whitespace:** Minimum py-20 for sections. Content breathes.
- **Micro-Whitespace:** Cards have gap-6. Form fields have gap-3.
- **Mobile Collapse:** All multi-column layouts → w-full px-4 py-8 on < 768px. No horizontal scroll.
- **No overlapping elements** — every component owns clear space.

## 6. Motion & Interaction

- **Global Transition:** transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] on interactive elements
- **Spring Physics:** Button hovers use scale transforms only (no translate, no color shift). scale-102 on hover, scale-98 on active.
- **Staggered Reveals:** Form inputs fade up from opacity-0 translate-y-8, each with delay-100 + index * 50ms
- **No perpetual loops** — motion serves purpose only (entry, feedback, state change)

## 7. Anti-Patterns (Strictly Banned)

- **NO** em-dashes (—) anywhere
- **NO** Inter font
- **NO** purple accents, neon glows, AI gradients
- **NO** centered Hero sections
- **NO** generic "3 equal cards" feature rows
- **NO** overlapping text and images
- **NO** broken Unsplash/placeholder image links
- **NO** emoji anywhere
- **NO** h-screen (always use min-h-[100dvh])
- **NO** harsh drop shadows without tint
- **NO** linear easing for transitions
- **NO** "Scroll to explore", "Swipe", scroll arrows
- **NO** custom mouse cursors
- **NO** generic names ("John Doe", "Acme Co")
- **NO** fake numbers ("99.99%", "1000+")
- **NO** AI copywriting clichés ("Elevate", "Seamless", "Unleash")
- **NO** decoration text strips
- **NO** floating eyebrows with no clear purpose

---

This design encodes precision, trust, and professional care. Every detail serves the user's success in interview preparation.
