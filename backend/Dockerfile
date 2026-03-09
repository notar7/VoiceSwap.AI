# ── VoiceSwap Backend — Cloud Run Dockerfile ─────────────────────────────────
# Python 3.11 slim base keeps the image small while staying compatible
FROM python:3.11-slim

# ffmpeg is required for audio extraction and video merge
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer-cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create the temp directory for job files
RUN mkdir -p tmp

# Cloud Run injects PORT env var (default 8080)
ENV PORT=8080

# Expose the port (documentation only — Cloud Run sets the actual port via env)
EXPOSE 8080

# Run with uvicorn; use $PORT so Cloud Run can override it
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
