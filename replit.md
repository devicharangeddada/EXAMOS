# EchOS — Sanctuary Study System

**Build ID: IMD-ECH-PRIME-01**  
Developed by imdvichrn & Echoless

## Overview
A premium Apple-style study sanctuary app built with React + Vite + TypeScript. Features a Neural Map syllabus, Sanctuary Arena focus timer, liquid audio HUD, and advanced spaced repetition.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS v4 (custom design token system)
- **Animations**: Motion (Framer Motion) — Liquid Spring physics (stiffness: 300, damping: 30)
- **Charts**: Recharts, D3
- **AI**: Google Gemini API (`@google/genai`)
- **Icons**: Lucide React
- **Storage**: localStorage + IndexedDB (via `idb`)
- **PDF**: react-pdf
- **Audio**: Web Audio API (custom AudioController with crossfade)

## Design System — Sanctuary Visual Language

### Color Palette
- **Night Mode**: `#000000` pure OLED base, `#0A0A0B` secondary (`--bg-elevated`), `#161618` cards (`--bg-card`)
- **Dark Mode**: `#0A0A0B` base, `#161618` surfaces
- **Accent**: `#4A90E2` system blue
- **Transitions**: all `500ms ease-out`

### CSS Tokens
- `--bg-sanctuary` — pure OLED black
- `--bg-elevated` — secondary layer (`#0A0A0B`)
- `--bg-card` — card surface (`#161618`)

## Core Screens

### Syllabus — Neural Map (`src/components/Syllabus.tsx`)
- Vertical tree hierarchy with glowing neural connector lines
- Gold-glow elite border + pulse animation at 100% completion
- Velocity Sparkline next to each node (real-time study speed indicator)
- Progressive disclosure: inactive subjects dim to 40% opacity
- Status dots with colored glow (green/amber/neutral)

### Focus Room — Sanctuary Arena (`src/components/FocusRoom.tsx`)
- Pure OLED black full-screen experience
- Ultra-thin weight-300 timer with soft breathing glow
- **Streak Flame**: animated SVG flame growing in intensity over time (24px→52px)
- **Liquid Volume Pillar**: vertical drag pillar, deep blue→vibrant violet gradient
- Haptic feedback at 0%/100% volume extremes
- Ambient HUD showing current soundscape + volume level
- Long-press (1s) to end session

### FloatingNav (`src/components/FloatingNav.tsx`)
- Map/Arena dual-tab labeling for Syllabus and Focus
- `env(safe-area-inset-bottom)` edge-to-edge mobile support
- Liquid Spring press animation on all nav items
- Focus "Arena" button elevated as accent circle

## Study Methods (Note type)
- **5-box Leitner**: `note.leitnerBox` (0–4)
- **Feynman**: `note.feynman.simpleExplanation` + `identifiedGaps`
- **SQ3R**: `note.sq3r.survey/questions/keyPoints/reciteSummary/reviewNotes`

## Data / Backup System (`src/lib/backup.ts`)
- `validateBackupText()` — strict JSON validation with structural checks
- `importDataFromText()` — dry-run mode before overwriting
- Settings → Data → "Restore System" triggers validated import flow

## Running
```
npm run dev
```
Workflow: "Start application" → port 5000, host 0.0.0.0

## Deployment
- Type: Static site
- Build: `npm run build` → `dist/`
