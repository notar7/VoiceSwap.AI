# VoiceSwap — Frontend Redesign Prompt
> Copy paste this entire prompt into your vibe coder (Claude Sonnet 4.6)

---

```
I need a complete frontend redesign of my VoiceSwap app. 
The backend logic is already done — we are only redesigning 
the frontend. Here is exactly what I need:

---

TECH STACK (keep same):
- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui
- Framer Motion for animations

---

DESIGN VIBE:
- Dark theme (background: #0a0a0a)
- Modern, premium SaaS feel — NOT a hackathon project look
- Smooth animations throughout using Framer Motion
- Color accent: Indigo (#6366f1) with subtle glow effects
- Font: Inter (Google Fonts)
- Every screen should feel polished and intentional

---

PAGE 1 — LANDING PAGE (app/page.tsx)

- Full screen hero section with an animated live background 
  (use a subtle animated gradient or floating particle effect 
  or animated mesh gradient — something that feels alive, 
  NOT a static background)
- Navbar at top: left side has logo (temporary SVG mic/voice 
  icon with "VoiceSwap" text — make it replaceable), right 
  side has "Get Started" button (indigo, rounded)
- Hero center content:
  - Big bold headline: "Replace Any Voice. Keep Every Emotion."
  - Subtitle: "Upload your video, pick a voice, let Gemini 
    analyze and recreate the performance — perfectly synced."
  - Big CTA button: "Get Started" with arrow icon, indigo 
    gradient, hover glow effect
- Below hero: Features section with 3-4 feature cards:
  - Gemini AI Analysis
  - Emotion Preserved
  - 8 Voice Options
  - Instant Download
  Each card has an icon, title, short description
- Smooth scroll, clean spacing
- Footer at bottom (described separately)
- Clicking "Get Started" (both navbar and hero CTA) navigates 
  to /studio

---

PAGE 2 — STUDIO PAGE (app/studio/page.tsx)

This is the main app page. It has a top progress bar with 
5 steps shown as circles with icons connected by a line. 
The active step glows indigo. Steps are:

  Step 1 icon: Upload icon (arrow up into box)
  Step 2 icon: CPU/chip icon or brain icon (AI processing)
  Step 3 icon: Mic icon (voice selection)
  Step 4 icon: Waveform/equalizer icon (synthesis)
  Step 5 icon: Play/video icon (result)

Progress bar sits at top of page always visible.
Below it, only the current step content is shown.

---

STEP 1 — VIDEO UPLOAD

- Large centered drag and drop zone (dashed border, indigo 
  on hover glow)
- Click to upload also works
- Show file name, duration, file size after upload
- Accepted formats: mp4, mov, avi
- Max size label: 500MB
- After successful upload auto advance to Step 2

---

STEP 2 — AI PROCESSING (sending to Gemini 2.5 Flash)

- Full step content area shows an animated processing UI
- Show two icons in the center with an animated data-sharing 
  visualization between them — like a pulsing line or 
  animated dots flowing between a "Video" icon on left and 
  a "Gemini" logo/brain icon on right, showing data transfer
- Below that show live status steps appearing one by one 
  with a small spinner on the active one:
    ✅ Video received
    ⏳ Extracting audio...
    ⏳ Sending to Gemini 2.5 Flash...
    ⏳ Transcribing speech...
    ⏳ Analyzing emotion & tone...
    ⏳ Generating voice direction...
  Each step animates in as it completes
- Auto advance to Step 3 when done

---

STEP 3 — VOICE DIRECTION + TRANSCRIPT + VOICE SELECTION

This step has a 3-column horizontal layout:

LEFT COLUMN (full page height, scrollable):
- Title: "Voice Direction" with a small Gemini badge
- Show the voice direction JSON from Gemini in a styled 
  code block (dark background, syntax highlighted, 
  scrollable, looks like a terminal/IDE)

MIDDLE COLUMN (full page height, scrollable):
- Title: "Transcript" with timestamp badge
- Show the transcript JSON in same styled code block

RIGHT COLUMN:
- Title: "Select a Voice"
- 2 column x 3 row grid of voice tiles (6 voices total)
- Each voice tile:
  - Top: Human avatar icon or illustrated face (use 
    lucide-react User/UserCircle icon or similar, 
    styled with indigo background circle)
  - Middle: Voice name (e.g. "Atlas", "Nova", "Sterling")
  - Small badge: accent (American / British / Indian etc)
  - Bottom: "Apply Voice" button (full width, indigo)
  - Selected tile: indigo border glow
- Only one voice can be selected at a time
- After clicking "Apply Voice" advance to Step 4

---

STEP 4 — VOICE SYNTHESIS + VIDEO PROCESSING

- Same animated style as Step 2 but different steps:
  Show live status steps appearing one by one:
    ✅ Voice selected: [voice name]
    ⏳ Building SSML from transcript...
    ⏳ Applying emotion markers...
    ⏳ Synthesizing voice with Google TTS...
    ⏳ Merging audio with video...
    ⏳ Finalizing output...
- In center show animated waveform visualization 
  (animated SVG bars going up and down like an equalizer) 
  while processing
- Auto advance to Step 5 when done

---

STEP 5 — RESULT SCREEN

- Two video players side by side:
  - Left: "Original" label on top, original video player
  - Right: "VoiceSwap" label on top with indigo badge, 
    processed video player
- Both videos should be the same size, centered
- Below the right (processed) video: 
  - Big "Download Video" button (indigo, with download icon)
- Below both videos centered:
  - "Process Another Video" button (outlined, not filled) 
    that resets everything back to Step 1
- Add a subtle success animation when this screen first 
  appears (confetti or a glow pulse)

---

FOOTER (on landing page):

- Dark background matching site
- Left: VoiceSwap logo + tagline "AI-powered voice replacement 
  for video creators"
- Center: Built with Gemini 2.5 Flash + Google Cloud TTS 
  (show small Google/Gemini badges)
- Right: "Built for Gemini Live Agent Challenge 2026"
- Bottom line: © 2026 VoiceSwap. All rights reserved.

---

IMPORTANT NOTES FOR IMPLEMENTATION:

1. Backend API calls stay exactly the same — only frontend 
   components are changing. Keep all existing API call logic 
   in lib/api.ts untouched unless a component rename requires 
   it.

2. For the processing steps in Step 2 and Step 4 — use 
   polling or simulate timed delays if the backend returns 
   all at once. The animated steps MUST appear one by one, 
   not all at once.

3. Use Framer Motion for:
   - Page/step transitions (fade + slide)
   - Processing step animations appearing one by one
   - Voice tile hover effects
   - Result screen entrance animation

4. All components go in /components folder, properly named.

5. Mobile responsiveness is NOT a priority — desktop only 
   is fine for the hackathon demo.

6. Do NOT change any backend code unless absolutely necessary.

Build this step by step, starting with the landing page 
first. Show me the result after each major section before 
moving on. Ask me if anything is unclear.
```
