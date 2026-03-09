# VoiceSwap.AI 🎤🎬

> **Swap the voice. Keep the soul.**  
> AI-powered voice replacement that preserves the emotional DNA of your original performance.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-voiceswap--ai.vercel.app-blue?style=for-the-badge)](https://voiceswap-ai.vercel.app)
[![Backend](https://img.shields.io/badge/API-Cloud%20Run-4285F4?style=for-the-badge&logo=google-cloud)](https://voiceswap-backend-mxqfca535a-uc.a.run.app/docs)
[![GitHub](https://img.shields.io/badge/GitHub-notar7%2FVoiceSwap.AI-181717?style=for-the-badge&logo=github)](https://github.com/notar7/VoiceSwap.AI)

---

## What It Does

VoiceSwap.AI takes any video, extracts the audio, uses **Gemini 2.5 Flash** to analyse the emotional content and generate a perfectly-timed script, then re-synthesises the voice via **Google Cloud Text-to-Speech** — all orchestrated by a **Google ADK agent** that decides which tools to call and when.

The result: the same words, the same emotion, a completely different (or better) voice — synced frame-perfectly to the original video.

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
│  voiceswap-backend-mxqfca535a-uc.a.run.app          │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Google ADK Agent  (gemini-2.5-flash)        │   │
│  │                                              │   │
│  │  Tool 1: analyze_audio_tool                  │   │
│  │    └─► Gemini 2.5 Flash — emotion analysis  │   │
│  │                                              │   │
│  │  Tool 2: synthesize_voice_tool               │   │
│  │    └─► Google Cloud TTS — SSML synthesis    │   │
│  │                                              │   │
│  │  Tool 3: merge_video_tool                    │   │
│  │    └─► ffmpeg — audio/video merge           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key Technologies
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.11, FastAPI |
| AI Orchestration | **Google ADK 1.26.0** (`google-adk`) |
| Audio Analysis | **Gemini 2.5 Flash** (`gemini-2.5-flash`) |
| Voice Synthesis | **Google Cloud Text-to-Speech** (Neural2 / Journey voices) |
| Video Processing | ffmpeg |
| Backend Hosting | **Google Cloud Run** (`us-central1`) |
| Frontend Hosting | Vercel |

---

## Google ADK Integration

The `backend/agent.py` file contains a `voiceswap_agent` built with **Google ADK**.

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

The agent receives a single prompt (`job_id` + `voice_id`) and autonomously decides to:
1. Call `analyze_audio_tool` → extracts transcript + emotion data via Gemini
2. Call `synthesize_voice_tool` → builds SSML + calls Google TTS
3. Call `merge_video_tool` → merges new audio into original video with ffmpeg

Accessible via `POST /run-agent/{job_id}` on the API.

---

## Live URLs

| Resource | URL |
|----------|-----|
| Frontend | https://voiceswap-ai.vercel.app |
| Backend API | https://voiceswap-backend-mxqfca535a-uc.a.run.app |
| API Docs (Swagger) | https://voiceswap-backend-mxqfca535a-uc.a.run.app/docs |
| Health Check | https://voiceswap-backend-mxqfca535a-uc.a.run.app/health |
| GCP Project | `gen-lang-client-0797384320` |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- [ffmpeg](https://ffmpeg.org/download.html) (must be on PATH)
- A `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
echo GEMINI_API_KEY=your_key_here > .env
echo GEMINI_MODEL=gemini-2.5-flash >> .env

# 4. Start server
uvicorn main:app --reload --port 8000
```

API will be at `http://localhost:8000` — Swagger UI at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create .env.local
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local

# 3. Start dev server
npm run dev
```

Frontend will be at `http://localhost:3000`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + ffmpeg/key status |
| POST | `/upload` | Upload video → returns `job_id` |
| GET | `/analyze/{job_id}` | Run Gemini audio analysis |
| GET | `/voices` | List available TTS voices |
| POST | `/preview-voice` | Preview a voice with sample text |
| POST | `/synthesize/{job_id}` | Synthesize audio for a job |
| POST | `/merge/{job_id}` | Merge new audio into video |
| GET | `/download/{job_id}` | Download processed video |
| GET | `/original/{job_id}` | Download original video |
| **POST** | **`/run-agent/{job_id}`** | **Run full ADK agent pipeline** |

### ADK Agent Endpoint

```bash
# Upload first
curl -X POST https://voiceswap-backend-mxqfca535a-uc.a.run.app/upload \
  -F "file=@your_video.mp4"
# → {"job_id": "abc123", ...}

# Run full pipeline via ADK agent (one call does everything)
curl -X POST https://voiceswap-backend-mxqfca535a-uc.a.run.app/run-agent/abc123 \
  -H "Content-Type: application/json" \
  -d '{"voice_id": "en-US-Journey-F"}'
# → {"status": "complete", "download_url": "/download/abc123", ...}
```

---

## Project Structure

```
VoiceSwap.AI/
├── backend/
│   ├── agent.py              # 🤖 Google ADK agent (3 tools)
│   ├── main.py               # FastAPI application (11 routes)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── cloudbuild.yaml       # Cloud Build config (20min timeout)
│   ├── models/
│   │   └── schemas.py        # Pydantic models
│   ├── services/
│   │   ├── gemini.py         # Gemini 2.5 Flash integration
│   │   ├── tts.py            # Google Cloud TTS integration
│   │   └── ffmpeg.py         # ffmpeg audio/video processing
│   └── utils/
│       ├── file_handler.py   # Job directory management
│       └── ssml_builder.py   # SSML generation for TTS
└── frontend/
    ├── app/
    │   ├── page.tsx           # Landing page
    │   ├── process/           # Upload + processing flow
    │   └── studio/            # Results + before/after player
    └── components/
        ├── VideoUploader.tsx
        ├── VoiceSelector.tsx
        ├── ProcessingStatus.tsx
        └── BeforeAfterPlayer.tsx
```

---

## Hackathon Submission

- **Track:** Gemini API Developer Competition — Live Agents
- **Mandatory Tech:** Google ADK (`google-adk==1.26.0`), Gemini 2.5 Flash, Google Cloud Run
- **Team:** Ashish Ransing
