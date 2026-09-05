# Gamified College Learning Platform

Three-service portfolio project: a Node/Express + MongoDB backend, a React (Vite + Tailwind)
frontend, and a standalone Python (FastAPI) microservice for AI quiz generation.

## Architecture

```
frontend (React/Vite)  ──►  backend (Node/Express, port 5000)  ──►  ai-service (FastAPI, port 8000)
                                      │
                                  MongoDB
```

The AI Quiz Generator is deliberately a **separate polyglot microservice**, not a route bolted onto
Express — the backend calls it over REST (`POST /generate-quiz`). This is the piece worth defending
in a viva: it's a real service boundary, not just "I called an API in a controller."

## What's implemented

**Auth & Roles** — JWT access + refresh tokens (refresh token in an httpOnly cookie), bcrypt password
hashing, role-based middleware (`student` / `faculty` / `admin`). Faculty accounts require admin
approval before they can create courses.

**Course Management** — Faculty create courses → modules → lessons. Students enroll and mark lessons
complete; progress is tracked in a separate `Enrollment` collection (not embedded in `Course`) so it
scales per-student instead of per-course.

**Quiz System** — Manual quiz creation by faculty, or AI-generated via the Python microservice.
Timed attempts with **tab-switch / focus-loss detection** (`visibilitychange` listener) as a real
anti-cheat mechanism — attempts with excessive tab switches are flagged and have XP reduced, not
silently accepted or fully zeroed.

**XP + Levels** (`backend/utils/xpEngine.js`) — XP scales by question difficulty (easy/medium/hard
multiplier), plus a capped streak bonus and a speed bonus (only awarded above a minimum score, so it
doesn't reward reckless guessing). Levels follow an exponential curve
(`xpForLevel(n) = 100 * 1.5^(n-2)`), so early levels come fast and later ones require sustained
engagement.

**Leaderboard** (`backend/utils/leaderboardEngine.js`) — Ranks are **precomputed and cached** in a
`LeaderboardEntry` collection (bulk-written), recomputed every 15 minutes via `node-cron` plus
immediately (async, non-blocking) after each quiz submission. Leaderboard reads are then O(1) sorted
lookups instead of aggregating/sorting the entire `User` collection on every page view — a real
scalability decision, and a good one to explain in a viva.

**AI Quiz Generator** (`ai-service/quiz_generator.py`) — Rule-based NLP by default (sentence
splitting → keyword extraction → fill-in-the-blank MCQ with distractors pulled from other keywords in
the same text). Fully offline, no API key required, every step explainable. If `GEMINI_API_KEY` is
set, it upgrades to LLM-generated conceptual questions, falling back to the rule-based path on any
API failure.

## Setup

### 1. MongoDB
Run MongoDB locally (`mongod`) or use a free MongoDB Atlas cluster. Copy the connection string into
`backend/.env`.

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in MONGO_URI and JWT secrets
npm install
npm run dev                # http://localhost:5000
```

### 3. AI service
```bash
cd ai-service
cp .env.example .env       # GEMINI_API_KEY is optional — leave blank to use the offline generator
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

### First run
1. Register an account with role **faculty** — it needs admin approval before it can create courses.
2. Register a second account with role **student**.
3. Register a third account, then manually set its `role` to `admin` in MongoDB (no public admin
   signup, by design) and use it to approve the faculty account.
4. Log in as faculty → create a course → add a module → paste some notes into the AI Quiz Generator.
5. Log in as student → enroll → take the quiz → watch XP, level, and the leaderboard update.

## Talking points for interviews / viva

- **Why a separate Python microservice instead of an LLM call in an Express route?** Polyglot
  architecture, service isolation (the quiz generator can be scaled/deployed independently), and it
  demonstrates REST-based service-to-service communication, not just a third-party API call.
- **Why is the leaderboard cached instead of a live sorted query?** Sorting the entire `User`
  collection on every leaderboard page view doesn't scale. Precomputing ranks on a schedule (plus an
  event-triggered recompute) trades a few minutes of staleness for O(1) reads.
- **Why is XP difficulty-weighted instead of flat-per-question?** A flat scheme rewards guessing on
  easy questions as much as mastering hard ones — the multiplier ties XP to actual demonstrated
  difficulty, and the streak/speed bonuses are separately capped so no single factor can dominate the
  score.
- **How does the anti-cheat mechanism work, and why reduce XP rather than block submission?** The
  `visibilitychange` event flags excessive tab-switching, but a genuine user might switch tabs once by
  accident — a full block would punish false positives too harshly, so the attempt is still recorded
  with a reduced XP award instead.
