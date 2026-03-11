# VoiceSwap.AI 🎤🎬

> **Swap the voice. Keep the soul.**  
> AI-powered voice replacement that preserves the emotional DNA of your original performance.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-voiceswap--ai.vercel.app-blue?style=for-the-badge)](https://voiceswap-ai.vercel.app)
[![Backend](https://img.shields.io/badge/API-Cloud%20Run-4285F4?style=for-the-badge&logo=google-cloud)](https://voiceswap-backend-139933973931.us-central1.run.app/docs)
[![GitHub](https://img.shields.io/badge/GitHub-notar7%2FVoiceSwap.AI-181717?style=for-the-badge&logo=github)](https://github.com/notar7/VoiceSwap.AI)

---

## What It Does

VoiceSwap.AI takes any video, extracts the audio, uses **Gemini 2.5 Flash** to analyse the emotional content and generate a perfectly-timed SSML script, then re-synthesises the voice via **Google Cloud TTS Chirp3-HD** — the highest-quality neural voices Google offers. The full pipeline is orchestrated by a **Google ADK agent**.

The result: the same words, the same emotion, a completely different voice — synced frame-perfectly to the original video using ffmpeg's `atempo` time-stretch filter.

---

## Architecture

```
User (Browser)
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  Next.js 15 Frontend  (Vercel)                      │
│  voiceswap-ai.vercel.app                            │
└──────────────────────┬──────────────────────────────┘
                       │  REST / JSON
                       ▼
┌─────────────────────────────────────────────────────┐
│  FastAPI Backend  (Google Cloud Run)                │
│  voiceswap-backend-139933973931.us-central1.run.app │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Google ADK Agent  (gemini-2.5-flash)        │   │
│  │                                              │   │
│  │  Tool 1: analyze_audio_tool                  │   │
│  │    └─► Gemini 2.5 Flash — emotion analysis  │   │
│  │         transcription + SSML direction       │   │
│  │                                              │   │
│  │  Tool 2: synthesize_voice_tool               │   │
│  │    └─► Google Cloud TTS Chirp3-HD (v1beta1) │   │
│  │                                              │   │
│  │  Tool 3: merge_video_tool                    │   │
│  │    └─► ffmpeg — atempo sync + video merge   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Rate Limiting (slowapi) — per IP:                  │
│    /upload: 20/min  /analyze: 10/min                │
│    /synthesize: 10/min  /run-agent: 5/min           │
└─────────────────────────────────────────────────────┘
```

### Key Technologies

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Lucide React |
| Backend | Python 3.11, FastAPI |
| AI Orchestration | **Google ADK 1.26.0** (`google-adk`) |
| Audio Analysis | **Gemini 2.5 Flash** (`gemini-2.5-flash`) |
| Voice Synthesis | **Google Cloud TTS — Chirp3-HD** (v1beta1 API) |
| Audio Sync | ffmpeg `atempo` filter (pitch-preserving time-stretch) |
| Rate Limiting | slowapi (per-IP limits on all endpoints) |
| Video Processing | ffmpeg / ffprobe |
| Backend Hosting | **Google Cloud Run** (`us-central1`) |
| Frontend Hosting | Vercel (auto-deploy from GitHub) |

---

## Available Voices

6 **Chirp3-HD** voices — Google's highest-quality neural TTS voices:

| Name | Gender | Voice ID |
|---|---|---|
| Charon | Male | `en-US-Chirp3-HD-Charon` |
| Fenrir | Male | `en-US-Chirp3-HD-Fenrir` |
| Orus | Male | `en-US-Chirp3-HD-Orus` |
| Aoede | Female | `en-US-Chirp3-HD-Aoede` |
| Kore | Female | `en-US-Chirp3-HD-Kore` |
| Leda | Female | `en-US-Chirp3-HD-Leda` |

> **Note:** Chirp3-HD voices use the `v1beta1` TTS endpoint and accept plain text only (not SSML). The backend automatically strips SSML tags before sending to these voices.

---

## Google ADK Integration

`backend/agent.py` contains a `voiceswap_agent` built with **Google ADK**.

```python
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

voiceswap_agent = Agent(
    name="voiceswap_agent",
    model="gemini-2.5-flash",
    instruction=AGENT_INSTRUCTION,
    tools=[analyze_audio_tool, synthesize_voice_tool, merge_video_tool],
)
```

The agent receives a single prompt (`job_id` + `voice_id`) and autonomously:
1. Calls `analyze_audio_tool` → extracts transcript + emotion data via Gemini
2. Calls `synthesize_voice_tool` → builds SSML + calls Google Cloud TTS Chirp3-HD
3. Calls `merge_video_tool` → time-stretches audio to match video duration, merges with ffmpeg

Accessible via `POST /run-agent/{job_id}` on the API.

---

## Live URLs

| Resource | URL |
|---|---|
| Frontend | https://voiceswap-ai.vercel.app |
| Backend API | https://voiceswap-backend-139933973931.us-central1.run.app |
| API Docs (Swagger) | https://voiceswap-backend-139933973931.us-central1.run.app/docs |
| Health Check | https://voiceswap-backend-139933973931.us-central1.run.app/health |
| GCP Project | `gen-lang-client-0797384320` |

---

## Local Spin-Up

### Prerequisites

- Python 3.11+
- Node.js 18+
- [ffmpeg](https://ffmpeg.org/download.html) installed and on your `PATH`
- A `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)
- A Google Cloud service account JSON with **Cloud Text-to-Speech API** enabled

### 1. Clone the repo

```bash
git clone https://github.com/notar7/VoiceSwap.AI.git
cd VoiceSwap.AI
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate
# Activate (macOS/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_gemini_api_key
#   GEMINI_MODEL=gemini-2.5-flash
#   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Start the backend server
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` — Swagger UI at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create local env file
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Verify Everything Works

```bash
# Check backend health
curl http://localhost:8000/health
# Expected: {"status":"healthy","ffmpeg_available":true,"gemini_key_set":true,...}

# List voices
curl http://localhost:8000/voices
# Expected: {"voices":[{"id":"en-US-Chirp3-HD-Charon",...},...]}
```

---

## API Reference

All write endpoints are rate-limited per IP using `slowapi`.

| Method | Endpoint | Rate Limit | Description |
|---|---|---|---|
| GET | `/health` | — | Health check + ffmpeg/key status |
| POST | `/upload` | 20/min | Upload video → returns `job_id` |
| POST | `/analyze/{job_id}` | 10/min | Run Gemini 2.5 Flash analysis |
| GET | `/voices` | — | List available Chirp3-HD voices |
| POST | `/preview-voice` | 30/min | Preview a voice with sample text |
| POST | `/synthesize/{job_id}` | 10/min | Synthesize audio via Google TTS |
| POST | `/merge/{job_id}` | 10/min | Time-stretch + merge into video |
| GET | `/download/{job_id}` | — | Download processed video |
| GET | `/original/{job_id}` | — | Download original video |
| **POST** | **`/run-agent/{job_id}`** | **5/min** | **Run full ADK agent pipeline** |

### Example: Full Pipeline via ADK Agent

```bash
# Step 1 — Upload video
curl -X POST https://voiceswap-backend-139933973931.us-central1.run.app/upload \
  -F "file=@your_video.mp4"
# → {"job_id": "abc123", "duration": 45.2, ...}

# Step 2 — Run full pipeline via ADK agent (one call does everything)
curl -X POST https://voiceswap-backend-139933973931.us-central1.run.app/run-agent/abc123 \
  -H "Content-Type: application/json" \
  -d '{"voice_id": "en-US-Chirp3-HD-Aoede"}'
# → {"status": "complete", "download_url": "/download/abc123", ...}

# Step 3 — Download
curl -o output.mp4 \
  https://voiceswap-backend-139933973931.us-central1.run.app/download/abc123
```

---

## Project Structure

```
VoiceSwap.AI/
├── backend/
│   ├── agent.py              # 🤖 Google ADK agent (3 tools)
│   ├── main.py               # FastAPI app + rate limiting (11 routes)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── cloudbuild.yaml       # Cloud Build config
│   ├── models/
│   │   └── schemas.py        # Pydantic models
│   ├── services/
│   │   ├── gemini.py         # Gemini 2.5 Flash — audio analysis + SSML
│   │   ├── tts.py            # Google Cloud TTS Chirp3-HD (v1beta1)
│   │   └── ffmpeg.py         # atempo sync + audio/video merge
│   └── utils/
│       ├── file_handler.py   # Job directory management
│       └── ssml_builder.py   # SSML generation
└── frontend/
    ├── app/
    │   ├── page.tsx           # Landing page
    │   ├── process/           # Upload + processing flow
    │   └── studio/            # Studio pipeline UI
    └── components/
        ├── VideoUploader.tsx
        ├── VoiceSelector.tsx
        ├── ProcessingStatus.tsx
        └── BeforeAfterPlayer.tsx
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | From [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | ✅ | Set to `gemini-2.5-flash` |
| `GOOGLE_APPLICATION_CREDENTIALS` | ✅ | Path to GCP service account JSON (for Cloud TTS) |
| `FRONTEND_URL` | Optional | Extra CORS origin to allow |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL — `http://localhost:8000` for local dev |

---

## Hackathon Submission

- **Challenge:** Gemini Live Agent Challenge
- **Mandatory Tech:** Google ADK (`google-adk==1.26.0`), Gemini 2.5 Flash, Google Cloud Run
- **Author:** Ashish Ransing

