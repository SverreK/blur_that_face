# Build context must be the project root, not backend/:
#   docker build -f backend/Dockerfile -t blur-that-face .

# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:22-slim AS frontend-build

WORKDIR /frontend

COPY package.json package-lock.json* ./
RUN npm ci

COPY index.html vite.config.ts tsconfig*.json eslint.config.js ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build
# Output lands in /frontend/dist


# ── Stage 2: production image ─────────────────────────────────────────────────
FROM python:3.11-slim

# System packages: ffmpeg for audio muxing, wget for model download
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies first (cache-friendly layer)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Download the Tasks-API BlazeFace model at build time so the container
# runs fully offline. The legacy blaze_face_full_range.tflite uses a
# different anchor layout and is NOT compatible with the Tasks API.
RUN wget -q \
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite" \
  -O /app/blaze_face_short_range.tflite

# Backend source
COPY backend/main.py backend/detector.py backend/tracker.py ./

# Frontend build artefacts from stage 1
COPY --from=frontend-build /frontend/dist /app/dist

# Thin wrapper: mounts the built frontend at "/" without modifying main.py.
# FastAPI routes (registered first via `from main import app`) take priority
# over the StaticFiles catch-all, so /api/* routes are unaffected.
RUN printf '%s\n' \
  'from main import app' \
  'from fastapi.staticfiles import StaticFiles' \
  'app.mount("/", StaticFiles(directory="/app/dist", html=True), name="static")' \
  > /app/serve.py

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
