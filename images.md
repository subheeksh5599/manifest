# Manifest — Image Prompts

All images generated at 1440x900 for the feature sections and OG card.

---

## 01 — Hero Background / OG Card

**Platform:** Midjourney / DALL-E 3 / Recraft

```
A high-security airlock control room, deep space dark atmosphere transitioning to bright blue technical lighting. A futuristic trading terminal interface floating in the center, showing green waveforms and Solana blockchain data streams. Minimal, clean, architectural. Dark navy background with electric blue glow. No people. Cinematic lighting. Product-focused. 8k resolution.

--ar 16:9 --style raw --stylize 250 --v 6.1
```

**Alt:** A clean abstract hero with a dark-to-blue gradient, subtle grid pattern, and a single floating holographic terminal showing tokenized equity data.

---

## 02 — Plan Builder Screenshot

**Platform:** Record from the actual deployed app (manifest-mocha-six.vercel.app/plan) with Chrome DevTools set to 1440x900.

**Steps:**
1. Open the plan builder page
2. Select TSLAx from the mint dropdown
3. Fill in the form fields: Size $100, Slippage 50bps, Exit bound 30bps, Max Ref Age 120s
4. Click Evaluate
5. Take a full-viewport screenshot

**Fallback (if mock needed for the image prompt file):**
```
A dark-themed Solana dApp plan builder form. Dark background (#1D1D21). A dropdown for TSLAx selected. Form fields for Multiplier Snapshot, Route Cost, Exit Bound, Requested Size. A pill-shaped blue "Evaluate" button. A verdict badge showing ACCEPT in green. Clean sans-serif typeface, tight letter-spacing on labels. No wallet, no login screen.
```

**Location:** `public/shots/plan.png`

---

## 03 — Refusal Tape Screenshot

**Platform:** Record from the deployed app (manifest-mocha-six.vercel.app/tape)

**Steps:**
1. Open the tape page
2. Scroll to show 3-4 tape rows with verdicts (ACCEPT, REFUSE)
3. Capture full viewport

**Fallback prompt:**
```
A blockchain audit log / tape interface on dark background. A list of rows with verdict badges. Green pill "ACCEPT" and orange pill "REFUSE". Each row shows: check_id, slot number, account data hash. Minimal, monospaced data view. Clean grid layout. Part of a Solana dApp.
```

**Location:** `public/shots/tape.png`

---

## 04 — Truth Card Screenshot

**Platform:** Record from deployed app (manifest-mocha-six.vercel.app/mint/<addr>)

**Steps:**
1. Open the mint truth card page
2. Should show: mint address, multiplier, pause state, delegate, hook
3. Full viewport screenshot

**Fallback prompt:**
```
A single token mint information card on a dark background. Displays a Solana Token-2022 mint address, scaled UI amount multiplier value, pausable config toggle, permanent delegate address, transfer hook status. Clean monospaced data layout with labeled fields. Blue accent for the live indicator. Blockchain security-focused interface design.
```

**Location:** `public/shots/mint.png`

---

## 05 — Feature Card Illustrations

### 05a — Compose icon

**Platform:** DALL-E 3

```
A minimal icon representing "compose" — a geometric arrangement of three interlocking rings or a layered document outline. Monochrome, line-art style, 1px stroke weight. Suitable for a feature card header. Clean, technical, no text. White on transparent background, 120x120px.
```

**Location:** `public/shots/icon-compose.png`

### 05b — Simulate icon

```
A minimal icon for "simulate" — a hexagonal play button with a waveform emananting from it, or a magnifying glass with a graph line inside. Line-art monochrome, 1px stroke. Clean and technical. 120x120px.
```

**Location:** `public/shots/icon-simulate.png`

### 05c — Refuse/Fill icon

```
A minimal icon for "refuse or fill" — a shield with a checkmark and an X mark side by side, or a gate mechanism. Monochrome line-art. 120x120px.
```

**Location:** `public/shots/icon-refuse.png`

---

## 06 — Customer / Partner Logos Grid

**Platform:** Simple text

A 2x3 grid of grayscale logos for:
- Solana Foundation
- Backed Finance / xStocks
- Jupiter
- Token-2022
- Chainlink
- Pyth Network

Use their official monochrome SVG marks from each brand's press kit. Place at 60-80% opacity. Grayscale filter on each.

**Location:** Top of the features section or bottom of hero.

---

## Image Directory

```
public/
  shots/
    plan.png          1440x900 — plan builder UI
    tape.png          1440x900 — refusal tape table
    mint.png          1440x900 — mint truth card
    icon-compose.png  120x120  — feature card icon
    icon-simulate.png 120x120  — feature card icon  
    icon-refuse.png   120x120  — feature card icon
  og-card.png         1200x630 — social share card
  favicon.ico
```

## OG Card Prompt (1200x630)

```
A dark deep-space background transitioning to electric blue at the bottom center. The word "Manifest" in large white thin sans-serif type, -2px letter-spacing. Below it: "A recurring buy that either fills at a verified price, or refuses on-chain." Small text. Green accent dot in the corner. Solana logo faint in the background. Clean, minimal, crypto-security themed. No people.

--ar 1.91:1 --style raw --v 6.1
```