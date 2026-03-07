# 🎙️ VoiceSwap — Hackathon Build Guide
> Gemini Live Agent Challenge | Devpost
> Vibe code this phase by phase, no stress.

---

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### What is this?
A web app that takes a video with a single person talking and replaces their voice with a selected voice — preserving the original speech's emotion, tone, and timing. Built for content creators who face voice mismatch issues when generating videos with tools like Google Flow.

### Core User Flow
1. User uploads a video (mp4/mov)
2. App transcribes the speech using Gemini
3. Gemini analyzes tone, emotion, and pacing of the original speech
4. User selects a target voice from a preset voice library
5. Gemini acts as "Voice Director" — generates style instructions for TTS
6. Google Cloud TTS synthesizes the new voice with correct emotion
7. ffmpeg merges new audio with original video (replacing original audio)
8. User previews and downloads the final video

### Key Features (MVP)
- [ ] Video upload (max 2 mins for demo purposes)
- [ ] Auto transcription via Gemini
- [ ] Emotion + tone analysis via Gemini
- [ ] Voice library (5–8 preset Google TTS voices)
- [ ] Voice preview before applying
- [ ] Processing status with progress steps
- [ ] Final video preview + download
- [ ] Before/After audio comparison

### Out of Scope (for now)
- Lip sync (too complex, mention as future feature)
- Multi-speaker videos
- Real-time processing
- Mobile app

### What makes this stand out for judges
- Gemini is the **brain**, not just a transcriber — it acts as an AI Voice Director
- Full Google ecosystem (Gemini + Google TTS) — perfect for a Google hackathon
- Solves a real, specific pain point for AI video creators
- Clean, polished UI that looks production-ready

---

## 2. TECH STACK

### Frontend
| Tool | Purpose |
|------|---------|
| Next.js 14 (App Router) | React framework |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| Framer Motion | Animations |
| Vercel | Hosting + deployment |

### Backend
| Tool | Purpose |
|------|---------|
| Python 3.11+ | Backend language |
| FastAPI | REST API framework |
| Google Gemini 2.0 Flash API | Transcription + emotion analysis + voice direction |
| Google Cloud Text-to-Speech API | Voice synthesis |
| ffmpeg | Audio extraction + video/audio merging |
| Railway / Render | Backend hosting (free tier) |

### Storage (temporary, during processing)
| Tool | Purpose |
|------|---------|
| Local /tmp directory | Store uploaded + processed files during pipeline |
| No persistent storage needed | Files are ephemeral — download and done |

### APIs & Keys Needed
- `GEMINI_API_KEY` — from Google AI Studio (free)
- `GOOGLE_APPLICATION_CREDENTIALS` — for Google Cloud TTS (free tier: 1M chars/month)

---

## 3. ARCHITECTURE

```
[User Browser - Next.js]
        |
        | REST API calls
        v
[FastAPI Backend - Python]
        |
        |-- /upload ---------> Save video to /tmp
        |
        |-- /process --------> 1. Extract audio from video (ffmpeg)
        |                       2. Send audio to Gemini → get transcript
        |                       3. Send transcript + audio to Gemini → get emotion analysis
        |                       4. Gemini generates "Voice Direction" JSON
        |
        |-- /synthesize -----> 1. Take transcript + voice direction
        |                       2. Call Google Cloud TTS with SSML
        |                       3. Get synthesized audio back
        |
        |-- /merge ----------> 1. Replace original audio with new audio (ffmpeg)
        |                       2. Return final video file URL
        |
        v
[User downloads final video]
```

### Gemini's Role (Important for judging)
Gemini does THREE things — not just transcription:

1. **Transcription** — Convert video audio to text with timestamps
2. **Emotion Analysis** — Detect tone, emotion, pace, emphasis points in the speech
3. **Voice Direction** — Output a structured JSON like:
```json
{
  "overall_tone": "calm and explanatory",
  "pace": "moderate",
  "emphasis_words": ["important", "remember", "key"],
  "emotion_segments": [
    { "start": 0, "end": 5, "emotion": "neutral", "pitch": "medium" },
    { "start": 5, "end": 12, "emotion": "excited", "pitch": "high" }
  ],
  "ssml_hints": "Speak clearly with slight enthusiasm, pause after key points"
}
```
This JSON is then used to construct SSML for Google TTS — making the synthesized voice actually expressive.

---

## 4. CODING RULES

### General
- Keep functions small and single-purpose
- Every API endpoint should have proper error handling with meaningful messages
- No hardcoded API keys — always use `.env` / environment variables
- Comment the "why" not the "what"

### Backend (Python/FastAPI)
```
backend/
├── main.py              # FastAPI app + routes
├── services/
│   ├── gemini.py        # All Gemini API calls
│   ├── tts.py           # Google Cloud TTS calls
│   └── ffmpeg.py        # All ffmpeg operations
├── models/
│   └── schemas.py       # Pydantic request/response models
├── utils/
│   └── file_handler.py  # Upload, temp file management
├── .env                 # API keys (never commit)
└── requirements.txt
```

- Use `async/await` in FastAPI routes
- Use Pydantic models for all request/response shapes
- Clean up /tmp files after processing is done
- Use `python-multipart` for file uploads

### Frontend (Next.js)
```
frontend/
├── app/
│   ├── page.tsx          # Main landing + upload page
│   ├── process/
│   │   └── page.tsx      # Processing + results page
│   └── layout.tsx
├── components/
│   ├── VideoUploader.tsx
│   ├── VoiceSelector.tsx
│   ├── ProcessingStatus.tsx
│   ├── VideoPreview.tsx
│   └── BeforeAfterPlayer.tsx
├── lib/
│   └── api.ts            # All backend API calls
└── types/
    └── index.ts          # TypeScript types
```

- Use TypeScript throughout
- No inline styles — Tailwind only
- Keep API calls in `lib/api.ts`, never scattered in components
- Use `useState` + `useEffect` for simple state, no need for Redux

### Git Rules
- Commit at the end of each phase
- Commit message format: `phase-1: working video upload and transcription`

---

## 5. UI GUIDELINES

### Vibe
- **Dark theme** — looks modern, suits a video/audio tool
- Clean, minimal — let the product speak
- Subtle gradients and glow effects (not overdone)
- Think: a polished SaaS tool, not a hackathon project

### Color Palette
```
Background:     #0a0a0a  (near black)
Surface:        #111111  (cards, panels)
Border:         #222222  (subtle borders)
Primary:        #6366f1  (indigo — action buttons)
Primary Glow:   #6366f133 (glow effect)
Text Primary:   #ffffff
Text Secondary: #888888
Success:        #22c55e
Error:          #ef4444
```

### Key Screens

**Screen 1 — Upload Page**
- Big centered upload dropzone (drag + drop or click)
- App name + one-line description at top
- Simple, no clutter
- Show file name + duration after upload

**Screen 2 — Voice Selector**
- Grid of voice cards (5–8 voices)
- Each card: Voice name, language, gender icon, play button (preview)
- Selected voice has indigo border glow
- "Process Video" CTA button at bottom

**Screen 3 — Processing**
- Animated step-by-step progress:
  - ✅ Video uploaded
  - ⏳ Extracting audio...
  - ⏳ Analyzing speech with Gemini...
  - ⏳ Generating voice direction...
  - ⏳ Synthesizing new voice...
  - ⏳ Merging audio with video...
- Each step shows what's happening — makes Gemini's role visible to judges

**Screen 4 — Result**
- Side by side: Original video | New video
- Or: Toggle between Before/After
- Download button (prominent)
- "Process another video" link

### Typography
- Font: `Inter` (via Google Fonts)
- Headings: `font-bold`, large
- Body: `text-sm` or `text-base`, `text-gray-400`

### Components to use from shadcn
- `Button`, `Card`, `Progress`, `Badge`, `Separator`, `Tabs`

---

## 6. PHASES (Vibe Code at Your Own Pace)

---

### ✅ PHASE 0 — Project Setup
**Goal:** Everything scaffolded and running locally

**Tasks:**
- [ ] Create Next.js app: `npx create-next-app@latest frontend --typescript --tailwind`
- [ ] Install shadcn: `npx shadcn@latest init`
- [ ] Install shadcn components: `npx shadcn@latest add button card progress badge tabs separator`
- [ ] Create FastAPI backend folder, set up `main.py`, `requirements.txt`
- [ ] Install Python deps: `fastapi uvicorn python-multipart google-generativeai google-cloud-texttospeech python-dotenv`
- [ ] Verify ffmpeg is installed: `ffmpeg -version`
- [ ] Set up `.env` with `GEMINI_API_KEY`
- [ ] Connect frontend to Vercel (just push to GitHub, import on Vercel)
- [ ] Test frontend loads, test backend runs with `uvicorn main:app --reload`

**Done when:** Both frontend and backend run without errors locally.

---

### ✅ PHASE 1 — Video Upload + Audio Extraction
**Goal:** User can upload a video, backend extracts audio

**Backend tasks:**
- [ ] `POST /upload` — accepts video file, saves to `/tmp/{uuid}/input.mp4`
- [ ] After upload, auto-trigger ffmpeg to extract audio: `ffmpeg -i input.mp4 -vn -acodec pcm_s16le audio.wav`
- [ ] Return `{ job_id, duration, status: "audio_extracted" }`

**Frontend tasks:**
- [ ] Build `VideoUploader` component — drag/drop + click to upload
- [ ] Show upload progress bar
- [ ] After upload, show video filename + duration
- [ ] Store `job_id` in state for subsequent calls

**Done when:** Upload a video → backend extracts audio → frontend shows success.

---

### ✅ PHASE 2 — Gemini Transcription + Emotion Analysis
**Goal:** Gemini reads the audio and returns transcript + emotion analysis

**Backend tasks:**
- [ ] `POST /analyze/{job_id}` endpoint
- [ ] In `services/gemini.py`:
  - Send audio file to Gemini 2.0 Flash
  - Prompt 1: *"Transcribe this audio accurately with word-level timestamps"*
  - Prompt 2: *"Analyze the emotional tone, pacing, and key emphasis points. Return as JSON: overall_tone, pace, emphasis_words, emotion_segments, ssml_hints"*
- [ ] Return full analysis JSON to frontend

**Frontend tasks:**
- [ ] After upload success, auto-call `/analyze`
- [ ] Show animated "Analyzing with Gemini..." processing step
- [ ] Optionally show transcript in a collapsible panel (cool for demo)

**Done when:** Upload video → Gemini returns transcript + emotion JSON.

---

### ✅ PHASE 3 — Voice Library + Selection UI
**Goal:** User can browse and select a voice

**Backend tasks:**
- [ ] `GET /voices` — return hardcoded list of 6–8 Google TTS voices:
```python
voices = [
  { "id": "en-US-Neural2-D", "name": "Atlas", "gender": "Male", "accent": "American" },
  { "id": "en-US-Neural2-F", "name": "Nova", "gender": "Female", "accent": "American" },
  { "id": "en-GB-Neural2-B", "name": "Sterling", "gender": "Male", "accent": "British" },
  { "id": "en-GB-Neural2-C", "name": "Ivy", "gender": "Female", "accent": "British" },
  { "id": "en-IN-Neural2-B", "name": "Arjun", "gender": "Male", "accent": "Indian" },
  { "id": "en-IN-Neural2-A", "name": "Priya", "gender": "Female", "accent": "Indian" },
]
```
- [ ] `POST /preview-voice` — takes voice_id + sample text → returns short audio preview (3–5 sec)

**Frontend tasks:**
- [ ] Build `VoiceSelector` component — grid of voice cards
- [ ] Each card has play button for preview
- [ ] Selected voice gets indigo glow border
- [ ] "Apply Voice" CTA button

**Done when:** User can see voices, preview them, and select one.

---

### ✅ PHASE 4 — Voice Synthesis + Video Merge
**Goal:** Generate new audio with selected voice + merge into video

**Backend tasks:**
- [ ] `POST /synthesize/{job_id}` — takes `voice_id`
  - Pull transcript + emotion JSON from previous analysis
  - Build SSML from transcript using ssml_hints from Gemini
  - Call Google Cloud TTS with SSML + voice_id
  - Save synthesized audio to `/tmp/{job_id}/new_audio.mp3`
- [ ] `POST /merge/{job_id}`
  - ffmpeg command: replace original audio with new audio
  - `ffmpeg -i input.mp4 -i new_audio.mp3 -c:v copy -map 0:v:0 -map 1:a:0 output.mp4`
  - Return download URL for `output.mp4`

**Frontend tasks:**
- [ ] Show step-by-step processing animation (the 6 steps from UI section)
- [ ] Auto-poll or use status endpoint to update each step
- [ ] When done, show result screen

**Done when:** Full pipeline works end to end — upload → analyze → select voice → synthesize → merge → download.

---

### ✅ PHASE 5 — Result Screen + Before/After
**Goal:** Clean result experience

**Frontend tasks:**
- [ ] Build result page with two video players (original vs new)
- [ ] Or: single player with Before/After toggle tabs
- [ ] Big "Download" button
- [ ] "Process Another Video" button
- [ ] Confetti or subtle success animation (optional but nice for demo)

**Done when:** User can preview and download the final video cleanly.

---

### ✅ PHASE 6 — Polish + Demo Prep
**Goal:** Make it look and feel production-ready

**Tasks:**
- [ ] Error handling on all API calls — show friendly error messages in UI
- [ ] Loading states on every async action
- [ ] Test with 3–4 different videos
- [ ] Make sure it works on Vercel (env vars set, backend URL configured)
- [ ] Write README with setup instructions
- [ ] Record demo video:
  - Show original video playing
  - Show Gemini analysis (transcript + emotion JSON) — this impresses judges
  - Show voice selection
  - Show processing steps
  - Show final result — play both before/after
- [ ] Write Devpost submission — emphasize Gemini as the AI brain, not just a tool

---

## 7. GEMINI PROMPTS (Copy-Paste Ready)

### Transcription Prompt
```
Transcribe the speech in this audio file accurately. 
Return a JSON object with:
- "transcript": full text of the speech
- "words": array of { word, start_time, end_time } for each word
- "total_duration": total duration in seconds
Return only valid JSON, no markdown.
```

### Emotion Analysis Prompt
```
You are an expert voice director. Analyze the speech in this audio.
Return a JSON object with:
- "overall_tone": one sentence describing the overall tone
- "pace": "slow" | "moderate" | "fast"
- "energy": "low" | "medium" | "high"
- "emphasis_words": array of words that should be stressed
- "emotion_segments": array of { start_time, end_time, emotion, suggested_pitch }
- "ssml_hints": a short instruction for a TTS system on how to read this text expressively
Return only valid JSON, no markdown.
```

---

## 8. DEVPOST SUBMISSION TIPS

- **Title:** VoiceSwap — AI Voice Director for Video Content
- **Tagline:** Replace any voice in your video while preserving emotion, tone, and timing — powered by Gemini.
- **Track:** Multimodal Creative Director
- **Highlight Gemini's role** in every section — judges are looking for this
- **Demo video is 30% of your score** — spend real time on it
- Show the Gemini emotion JSON on screen during the demo — it's visual proof of intelligence
- Mention the Google Flow pain point in the intro — makes it relatable and real

---

*Good luck. Ship it. 🚀*

---

## 9. DEV NOTES (decisions made during build — do not delete)

### Gemini Model
- **Use `gemini-2.5-flash`** — NOT `gemini-2.0-flash`
- `gemini-2.0-flash` has 0/0 free tier quota on this account (India region restriction)
- `gemini-2.5-flash` has 5 RPM / 20 RPD — works fine
- Set via `GEMINI_MODEL=gemini-2.5-flash` in `backend/.env`
- Default in `services/gemini.py` is also set to `gemini-2.5-flash`

### Gemini API Call Optimization
- We use **1 combined Gemini call per video** (not 2 separate calls)
- Single prompt returns transcription + emotion analysis + voice direction together
- Cuts API usage in half → effectively 20 videos/day instead of 10
- The combined response is split into `transcript` and `voice_direction` dicts in `_upload_and_analyze()`
- See `COMBINED_PROMPT` in `services/gemini.py`

### UI Strategy
- **Do NOT polish UI phase by phase**
- Build all backend phases (3, 4, 5) with basic working UI first
- Then do **one big UI overhaul** at the end (before Phase 6)
- Reason: screens change significantly with each phase — polish at the end for consistency

### Phase Completion Status
- ✅ Phase 0 — Scaffold (Next.js + FastAPI + deps)
- ✅ Phase 1 — Video Upload + Audio Extraction (ffmpeg)
- ✅ Phase 2 — Gemini Transcription + Emotion Analysis
- ✅ Phase 3 — Voice Library + Selection UI
- ✅ Phase 4 — Voice Synthesis (Google TTS) + Video Merge (ffmpeg)
- ✅ Phase 5 — Result Screen + Before/After
- ✅ UI Overhaul — Full redesign (landing page, /studio, 5-step wizard, glassmorphism, animations)
- ⬜ Phase 6 — ADK Integration + GCP Deployment + Submission Materials

### TTS API Key Fix (important for new dev machines)
- API key from AI Studio is restricted to Generative Language API by default
- Must also allow "Cloud Text-to-Speech API" in the key's restrictions
- Go to: console.cloud.google.com/apis/credentials → edit key → API restrictions → add TTS
- "Restrict key" = WHITELIST (key IS allowed to use listed APIs, NOT blocked)
- Both Gemini + TTS use the same GEMINI_API_KEY — no separate TTS key needed

### ffmpeg Path (Windows)
- Installed at `F:\ffmpeg\ffmpeg-8.0.1\bin`
- Added to system PATH — new terminal sessions pick it up automatically

### asyncio + Windows Fix
- FastAPI on Windows can't use `asyncio.create_subprocess_exec` with uvicorn's default loop
- All ffmpeg/blocking calls use `loop.run_in_executor(None, ...)` instead
- See `services/ffmpeg.py` and `services/gemini.py`

---

## 10. HACKATHON CATEGORY DECISION

### Selected Category: Live Agents 🗣️
**Rationale:** VoiceSwap is an AI agent that orchestrates a multi-step pipeline using Gemini as the intelligence layer. ADK wraps each step as a tool, and Gemini decides how to orchestrate them. This is textbook ADK agent behavior — not just a "tool" app.

**Pitch framing for judges:**
> "VoiceSwap is an AI Voice Director Agent — you give it a video, it uses Gemini 2.5 Flash to analyze the speech (emotion, tone, pace, emphasis), directs an expressive voice performance using structured SSML, synthesizes it with Google Cloud TTS, and delivers you a new video. The entire pipeline is orchestrated by a Google ADK agent."

**Why this category wins over Creative Storyteller:**
- Mandatory tech (ADK) is unambiguous — no judge interpretation needed
- "AI Agent" framing is stronger than "creative tool"
- GCP deployment is required anyway → we have to do it regardless
- Cleaner story: one agent, many tools, one output

**Mandatory Tech Checklist:**
- ✅ Gemini 2.5 Flash (intelligence layer)
- ✅ Google GenAI SDK (google-genai)
- ⬜ ADK (Agent Development Kit) — add in Phase 6
- ✅ Google Cloud TTS (GCP service)
- ⬜ Hosted on Google Cloud — deploy in Phase 6

---

## 11. PHASE 6 PLAN — ADK + Deployment + Submission

### 11.1 ADK Integration
Wrap the existing pipeline in a Google ADK agent. Each backend step becomes an ADK tool.

**Tools to define:**
```python
# backend/agent.py
- tool: extract_audio(video_path) → audio_path
- tool: analyze_audio(audio_path) → { transcript, voice_direction }
- tool: synthesize_voice(transcript, voice_direction, voice_id) → mp3_path
- tool: merge_video(video_path, audio_path) → output_path
```

**Agent behavior:**
- User passes job_id + voice_id to the agent
- Agent calls tools in sequence
- Agent returns final download URL
- Existing `/synthesize` and `/merge` endpoints call the agent internally

**ADK install:** `pip install google-adk`

**Resources:**
- ADK docs: https://google.github.io/adk-docs/
- ADK Python quickstart: https://google.github.io/adk-docs/get-started/quickstart/

### 11.2 Google Cloud Deployment (Cloud Run)

**Steps:**
1. Create `Dockerfile` for the FastAPI backend
2. Build + push to Google Artifact Registry
3. Deploy to Cloud Run (`gcloud run deploy`)
4. Update frontend `.env` with the Cloud Run URL
5. Record a short screen video of Cloud Run dashboard showing the service running (proof of deployment)

**Key commands (to be run in Phase 6):**
```bash
# Build + push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT/voiceswap-backend

# Deploy to Cloud Run
gcloud run deploy voiceswap-backend \
  --image gcr.io/YOUR_PROJECT/voiceswap-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,GEMINI_MODEL=gemini-2.5-flash
```

### 11.3 UI Overhaul
Full redesign of all screens — done AFTER Phase 5 result screen is built:
- Dark glassmorphism aesthetic
- Animated gradient background
- Premium voice cards with waveform visualizations
- Smooth page transitions
- Before/After player with slider
- Mobile responsive

### 11.4 Submission Materials Checklist
- ⬜ **README.md** — spin-up instructions for judges (local + cloud)
- ⬜ **Architecture diagram** — Gemini → backend → TTS → ffmpeg flow
- ⬜ **Demo video** (<4 min) — show full pipeline end to end, pitch the problem
- ⬜ **Deployment proof** — Cloud Run dashboard screen recording OR code link
- ⬜ **Public GitHub repo** — push all code (make sure .env is in .gitignore ✅)
- ⬜ **Text description** — project summary, technologies, learnings

### 11.5 Demo Video Script (suggested)
```
0:00 - 0:30  Problem: "You've shot great content but your voice doesn't match 
              the energy/accent you need. Re-recording is painful."
0:30 - 1:00  Show uploading a video → Gemini analyzing → emotion JSON on screen
1:00 - 2:00  Select a voice → Apply → watch synthesis steps animate
2:00 - 3:00  Before/After player side-by-side — same words, new voice
3:00 - 3:30  Show architecture: Gemini (brain) → ADK agent → TTS → ffmpeg
3:30 - 4:00  Close: "VoiceSwap — your AI voice director, powered by Gemini"
```
