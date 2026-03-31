# Study App (AI Studio React App)

## Overview
A React + Vite + TypeScript study application that uses the Google Gemini AI API. Features include a dashboard, syllabus management, focus room, flashcards, stats, and settings.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts, D3
- **AI**: Google Gemini API (`@google/genai`)
- **Animation**: Motion (Framer Motion)
- **Icons**: Lucide React
- **Storage**: IndexedDB (via `idb`)
- **PDF**: react-pdf

## Project Structure
```
src/
  App.tsx          - Main app component with routing/navigation
  main.tsx         - Entry point
  index.css        - Global styles
  types.ts         - TypeScript type definitions
  store.ts         - State persistence (IndexedDB)
  components/      - UI components (Dashboard, Syllabus, FocusRoom, Flashcards, Stats, Settings, FloatingNav)
  lib/             - Utility functions
  services/        - API/service layer
```

## Configuration
- **Dev server**: port 5000, host 0.0.0.0, all hosts allowed (Replit proxy compatible)
- **Gemini API Key**: Set `GEMINI_API_KEY` in environment secrets

## Running
```
npm run dev
```
Workflow: "Start application" runs `npm run dev` on port 5000.

## Deployment
- Type: Static site
- Build: `npm run build` → outputs to `dist/`
- Deployed via Replit static hosting
