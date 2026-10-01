---
name: Warm Vintage Ledger
colors:
  surface: '#fff8f6'
  surface-dim: '#f6d2c5'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ec'
  surface-container: '#ffe9e2'
  surface-container-high: '#ffe2d8'
  surface-container-highest: '#ffdbcd'
  on-surface: '#2a170f'
  on-surface-variant: '#4f443f'
  inverse-surface: '#412b22'
  inverse-on-surface: '#ffede7'
  outline: '#82746e'
  outline-variant: '#d3c3bc'
  surface-tint: '#755848'
  primary: '#261207'
  on-primary: '#ffffff'
  primary-container: '#3d2619'
  on-primary-container: '#ae8c7a'
  inverse-primary: '#e5bfab'
  secondary: '#645e50'
  on-secondary: '#ffffff'
  secondary-container: '#eae2d0'
  on-secondary-container: '#6a6456'
  tertiary: '#320900'
  on-tertiary: '#ffffff'
  tertiary-container: '#551500'
  on-tertiary-container: '#f36737'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#e5bfab'
  on-primary-fixed: '#2b160b'
  on-primary-fixed-variant: '#5b4132'
  secondary-fixed: '#eae2d0'
  secondary-fixed-dim: '#cec6b5'
  on-secondary-fixed: '#1f1b10'
  on-secondary-fixed-variant: '#4b4639'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390b00'
  on-tertiary-fixed-variant: '#842500'
  background: '#fff8f6'
  on-background: '#2a170f'
  surface-variant: '#ffdbcd'
typography:
  headline-xl:
    fontFamily: Vollkorn
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Vollkorn
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Vollkorn
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  headline-sm:
    fontFamily: Vollkorn
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  headline-xl-mobile:
    fontFamily: Vollkorn
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  title-ledger:
    fontFamily: Vollkorn
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.03em
  currency-item:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  keypad-num:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style
This design system marries the timeless dignity of physical ledger notebooks (buku kas warung) with the tactile clarity of modern mobile utilities. Built specifically for micro, small, and medium enterprise (UMKM) operators, the visual narrative communicates permanence, meticulous trust, and effortless utility.

The aesthetic direction is **Modern Retro Editorial**:
- **Tactile Warmth:** Anchored by physical shopkeeping metaphors—paper receipt textures, leather-bound register folios, brass-edged tabs, and mechanical cash register inputs.
- **Editorial Legibility:** Elevated, authoritative typography paired with high-clarity sans-serif numbers ensures financial records and inventory quantities remain legible in bright tropical storefronts or dim late-night tally sessions.
- **Empathetic Utility:** Generous tap targets, instant visual acknowledgment for transaction logging, and deliberate friction on destructive debit actions inspire confidence and financial mastery without cognitive fatigue.

## Colors
The palette evokes aged butcher paper, warm saddle leather, and vintage stationery stamps, balanced by high-contrast functional values.

- **Primary Canvas & Surfaces:**
  - Base canvas: `#FAF6EE` (Warm Parchment).
  - Surface layers: `#F4EBD9` (Buff Ledger Card) for secondary containers; `#FFFFFF` (Crisp Register Slip) for high-focus editable surfaces and receipt views.
  - Border line: `#E3D5C0` (Weathered Stitch).
- **Core Pigments:**
  - Deep Espresso: `#2B1810` (Primary text, high-value amounts, ledger rule lines).
  - Saddle Leather: `#3D2619` (Primary branding, filled interactive anchors).
  - Rich Cognac: `#5C3A21` (Interactive secondary buttons, active tab indicators).
  - Muted Sepia Gray: `#7C6E65` (Timestamps, non-active metadata, subtext).
- **Accents & Semantics:**
  - Terracotta / Burnt Orange: `#E05A2B` (Interactive highlights, callouts, pending actions) and `#F97316` (Focus rings, attention flags).
  - Masuk / Cash In (Status Green): `#2E7D32` with `#E8F5E9` container fill.
  - Keluar / Cash Out (Status Red): `#C62828` with `#FFEBEE` container fill.

## Typography
Typographic expression is balanced between editorial poise and numerical functionality:

- **Headlines (Vollkorn):** Used exclusively for titles, section headers, summary balance cards, and receipt titles. Its sturdy, historical serifs communicate tradition and accountability.
- **Body & Tabular Digits (Plus Jakarta Sans):** Applied across all balance entries, Rupiah figures (`Rp`), inventory counters, form labels, and keypad displays. Always enforce `font-variant-numeric: tabular-nums lining-nums` across financial columns to preserve clean vertical alignment of comma-separated amounts.
- **Micro Labels:** Rendered in semi-bold sans-serif with slight tracking for category badges, ledger flags (HUTANG, LUNAS, STOK KRITIS), and timestamp captions.

## Layout & Spacing
The layout model is optimized for single-handed mobile navigation on a standard 390px viewport width:

- **Grid Architecture:** 4-column fluid mobile grid with 16px (`1rem`) outer screen margins and 16px (`1rem`) gutters.
- **Vertical Rhythm:** 4px baseline rhythm. Components utilize `space-sm` (8px) for related items, `space-md` (16px) for intra-card content separation, and `space-xl` (28px) to delimit thematic journal sections (e.g., separating today's transactions from the weekly ledger balance).
- **Thumb Zone Anchor:** Cashier calculations and inventory input modules maintain fixed bottom-docked layouts spanning the full viewport with safe-area insets, placing the numpad and action trays within the natural thumb arc.

## Elevation & Depth
Elevation mimics the real-world stacking of thick, cotton-rich paper cards resting on oiled wooden counters. Harsh dropshadows and glassy blurs are avoided.

- **Surface Levels:**
  - **Level 0 (Ledger Desk):** Flat `#FAF6EE` background.
  - **Level 1 (Folio Card / Table Row):** Pure `#FFFFFF` or `#F4EBD9` with a subtle vintage outline (`1px solid #E3D5C0`) and an ambient, warm downward tint: `box-shadow: 0 2px 4px rgba(61, 38, 25, 0.04), 0 1px 2px rgba(61, 38, 25, 0.06)`.
  - **Level 2 (Active Cash Slip / Bottom Sheet):** `#FFFFFF` with `box-shadow: 0 8px 20px rgba(43, 24, 16, 0.08), 0 2px 6px rgba(43, 24, 16, 0.04)`.
  - **Level 3 (Tactile Numpad Buttons & Float Bar):** Elevated tactile items feature a distinct dual-tone bottom bevel (`box-shadow: 0 3px 0 #C9BBA5`) that shifts downward on active press (`transform: translateY(2px); box-shadow: 0 1px 0 #C9BBA5`) to reinforce physical mechanical confirmation.

## Shapes
Geometry balances friendly curves with paper-notebook rigidity:

- **Core Border Radius:** Set to Level 2 (base `0.5rem` / 8px). Cards and modal containers adopt `rounded-lg` (16px / `1rem`), providing a notebook folio silhouette.
- **Interactive Triggers:** Buttons, segmented controls, and keypad buttons use a standardized `12px` to `16px` radius to retain touch friendliness without appearing child-like.
- **Badges & Stamps:** Inventory status pills and transaction categorization tags use semi-rounded pills (`24px`) reminiscent of rubber-stamped inventory labels.

## Components

### Buttons
- **Primary (Record Entry / Simpan Transaksi):** Background `#3D2619`, text `#FAF6EE`, font `label-md`. Height: 52px. Border-radius: 14px. Drop bevel: `box-shadow: 0 3px 0 #20130B`. Active state lowers elevation by 2px.
- **Terracotta Accent (Jual / Kas Masuk):** Background `#E05A2B`, text `#FFFFFF`, drop bevel: `box-shadow: 0 3px 0 #A83A14`.
- **Secondary / Ghost:** Background `#F4EBD9`, border `1px solid #D8C7AF`, text `#3D2619`. No drop shadow.

### Cards & Ledger Blocks
- Standard ledger container: Background `#FFFFFF`, border `1px solid #E3D5C0`, radius `16px`, padding `space-md`.
- Header cards display a faint top accent stitch line: `border-top: 3px solid #5C3A21`.
- Ledger balance summary uses `#F4EBD9` filled surface with indented dividers (`1px dashed #C9BBA5`).

### Input Fields & Tactile Keypad
- **Text Inputs:** Background `#FFFFFF`, border `1.5px solid #D8C7AF`, border-radius `12px`, padding `14px 16px`. Active focus state triggers border color `#E05A2B` with a subtle warm glow (`0 0 0 3px rgba(224, 90, 43, 0.15)`).
- **Numeric Ledger Keypad:** 3x4 grid embedded directly into checkout/entry views. Keys feature background `#FFFFFF`, text `#2B1810` in `keypad-num`, border `1px solid #E3D5C0`, and mechanical bottom bevel (`box-shadow: 0 2px 0 #D4C3AC`).

### Chips & Badges
- **Status Pills:** Padding `4px 10px`, radius `20px`.
  - Cash In: Background `#E8F5E9`, text `#2E7D32`, border `1px solid #C8E6C9`.
  - Cash Out: Background `#FFEBEE`, text `#C62828`, border `1px solid #FFCDD2`.
  - Debt / Piutang: Background `#FFF3E0`, text `#E65100`, border `1px solid #FFE0B2`.

### Transaction Lists
- Divided rows with alternating micro-tint (`#FAF6EE` on odd rows or separated by `1px solid #EFE5D5`).
- Left cluster: Vollkorn date stamp + Plus Jakarta Sans category label.
- Right cluster: Tabular monetary values with explicit plus/minus symbols (`+ Rp 45.000` in status green, `- Rp 12.500` in status red).

### Checkboxes & Radios
- Square with 4px rounded corners (`rounded-sm`). Unchecked: Background `#FFFFFF`, border `1.5px solid #7C6E65`. Checked: Background `#3D2619`, checkmark icon in `#FAF6EE`.