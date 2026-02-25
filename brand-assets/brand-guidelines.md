# Loadout — Brand Guidelines

## Logo

### Primary Logo
The primary logo is the horizontal lockup (icon + wordmark). Use this version whenever space permits.

![Primary Logo](svg/loadout-horizontal.svg)

### Logo Variants
| Variant | File | Use |
|---------|------|-----|
| Horizontal | `loadout-horizontal.svg` | Headers, email signatures, documents |
| Stacked | `loadout-stacked.svg` | Social profiles, presentations, print |
| Mark only | `loadout-mark.svg` | Favicons, app icons, small spaces |
| Wordmark only | `loadout-wordmark.svg` | When mark is already visible nearby |

### Color Versions
- **Full color** — Default use on light backgrounds
- **On dark** (`-on-dark`) — For dark backgrounds
- **Monochrome** (`-mono-dark`, `-mono-light`) — Single-color contexts
- **Black / White** — Print, overlays, watermarks

### Clear Space
Maintain a minimum clear space around the logo equal to the height of the mark. No text, graphics, or other elements within this zone.

### Minimum Size
- Digital: 24px height minimum (mark only), 100px width minimum (horizontal)
- Print: 0.5 inch height minimum (mark only), 1.5 inch width minimum (horizontal)

### Incorrect Usage
- Do not stretch, skew, or rotate the logo
- Do not change the logo colors outside the approved palette
- Do not add effects (shadows, outlines, glows)
- Do not place on busy/low-contrast backgrounds without sufficient clear space
- Do not rearrange the lockup elements

---

## Colors

### Primary Palette
| Role | Color | Hex | Use |
|------|-------|-----|-----|
| Primary | Deep Navy | `#1E40AF` | Logo, headings, primary buttons, links |
| Secondary | Dark Navy | `#1E3A8A` | Supporting elements, sections, depth |
| Accent | Bright Blue | `#3B82F6` | Highlights, CTAs, badges, emphasis |

### Neutrals
| Role | Hex | Use |
|------|-----|-----|
| Text / Dark | `#0C0A14` | Body text, headings, dark UI |
| Light / Background | `#F0F4FF` | Page backgrounds, cards, light UI |

### Tailwind Config
```js
colors: {
  brand: {
    primary: '#1E40AF',
    secondary: '#1E3A8A',
    accent: '#3B82F6',
  }
}
```

---

## Typography

### Font Family
- **Primary**: Space Grotesk — Headings, logo wordmark, navigation
- **Body**: Space Grotesk — Body text, paragraphs, UI copy

### Font Weights
| Context | Weight | Size |
|---------|--------|------|
| H1 | Bold (700) | 32-48px |
| H2 | SemiBold (600) | 24-32px |
| H3 | SemiBold (600) | 18-24px |
| Body | Regular (400) | 16px |
| Small / Caption | Regular (400) | 14px |

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Assets Included

```
brand-assets/
├── svg/                    # All logo SVGs (scalable, editable)
├── favicons/               # Website favicons + favicon.ico
├── app-icons/              # iOS + Android app icons
├── general/                # PNG exports at standard sizes
├── social/                 # OG images for social sharing
├── email/                  # Email signature logo
└── brand-guidelines.md     # This file
```

---

## Quick Reference

| Need | File |
|------|------|
| Website header | `svg/loadout-horizontal.svg` |
| Favicon | `favicons/favicon.ico` + `favicons/favicon.svg` |
| iOS app icon | `app-icons/apple-touch-icon-180x180.png` |
| Android app icon | `app-icons/android-chrome-512x512.png` |
| Social sharing | `social/og-image.png` |
| Twitter card | `social/twitter-image.png` |
| Email signature | `email/email-sig-logo.png` |
| Dark background | `svg/loadout-horizontal-on-dark.svg` |
| Print (B&W) | `svg/loadout-horizontal-black.svg` |

---

## HTML Tags

### Favicons
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png">
```

### Open Graph
```html
<meta property="og:image" content="/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Loadout — Gear up your AI tools">
```

### Twitter Card
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/twitter-image.png">
<meta name="twitter:image:alt" content="Loadout — Gear up your AI tools">
```

### Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```
