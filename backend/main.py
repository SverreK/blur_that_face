"""
Blur That Face — FastAPI backend

Flow:
  POST /api/upload        → save video, extract frames with FFmpeg → status: frames_ready
  GET  /api/jobs/{id}     → poll job metadata (status, frame_count, fps, …)
  POST /api/jobs/{id}/detect  → run OpenCV face detection on every frame (next step)
  POST /api/jobs/{id}/render  → produce blurred output video (next step)
  GET  /api/jobs/{id}/output  → stream finished video
"""

import json
import os
import subprocess
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Config — paths can be overridden with env vars (handy in Docker)
# ---------------------------------------------------------------------------

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/btf/uploads"))
JOBS_DIR   = Path(os.getenv("JOBS_DIR",   "/tmp/btf/jobs"))

ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov"}

# FFmpeg outputs one JPEG per frame at this quality (2 = near-lossless, 31 = worst).
# 3-5 is a good balance between disk use and detection accuracy.
FRAME_QUALITY = int(os.getenv("FRAME_QUALITY", "4"))

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Blur That Face API")

# Allow the Vite dev server (port 5173) to call us without CORS errors.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Tiny meta-data helpers
#
# Each job lives in  JOBS_DIR/<job_id>/
#   meta.json   — all job state
#   frames/     — extracted JPEG frames (frame_000001.jpg, …)
# ---------------------------------------------------------------------------

def _job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def _read_meta(job_id: str) -> dict:
    path = _job_dir(job_id) / "meta.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    return json.loads(path.read_text())


def _write_meta(job_id: str, data: dict) -> None:
    _job_dir(job_id).mkdir(parents=True, exist_ok=True)
    (_job_dir(job_id) / "meta.json").write_text(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# Frame extraction
#
# We call FFmpeg as a subprocess rather than using a Python binding so that
# the Docker image only needs the ffmpeg system package — no heavy Python
# wrappers required.
#
# Command breakdown:
#   ffmpeg -i <video>          — input file
#   -q:v <quality>             — JPEG quality (lower = better)
#   frames/frame_%06d.jpg      — zero-padded output filenames
#
# We also run a quick `ffprobe` first to learn the video's FPS and total
# frame count so the frontend can show a progress bar.
# ---------------------------------------------------------------------------

def _probe_video(video_path: Path) -> tuple[float, int]:
    """Return (fps, frame_count) for *video_path* using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-count_packets",
        "-show_entries", "stream=r_frame_rate,nb_read_packets",
        "-of", "json",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    info = json.loads(result.stdout)
    stream = info["streams"][0]

    # r_frame_rate is a fraction string like "30000/1001" or "25/1"
    num, den = stream["r_frame_rate"].split("/")
    fps = round(float(num) / float(den), 3)

    frame_count = int(stream.get("nb_read_packets", 0))
    return fps, frame_count


def _extract_frames(job_id: str) -> None:
    """
    Background task: extract frames from the uploaded video.

    Sets job status to 'extracting' while running, then 'frames_ready'
    on success or 'error' on failure.
    """
    meta = _read_meta(job_id)
    video_path = Path(meta["video_path"])
    frames_dir = _job_dir(job_id) / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    meta["status"] = "extracting"
    _write_meta(job_id, meta)

    try:
        fps, frame_count = _probe_video(video_path)

        cmd = [
            "ffmpeg", "-y",           # -y: overwrite without prompting
            "-i", str(video_path),
            "-q:v", str(FRAME_QUALITY),
            str(frames_dir / "frame_%06d.jpg"),
        ]
        # check=True raises CalledProcessError if ffmpeg exits non-zero
        subprocess.run(cmd, capture_output=True, check=True)

        # Count how many frames were actually written (ground truth)
        actual_frames = len(list(frames_dir.glob("frame_*.jpg")))

        meta.update({
            "status": "frames_ready",
            "fps": fps,
            "frame_count": actual_frames,
            "frames_dir": str(frames_dir),
        })
        _write_meta(job_id, meta)

    except subprocess.CalledProcessError as exc:
        meta["status"] = "error"
        meta["error"] = exc.stderr.decode(errors="replace")
        _write_meta(job_id, meta)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Upload -----------------------------------------------------------------
#
# 1. Validate extension.
# 2. Stream the file to disk under UPLOAD_DIR/<job_id>.<ext>.
# 3. Write initial metadata so the job is immediately poll-able.
# 4. Kick off _extract_frames as a FastAPI BackgroundTask — the HTTP
#    response returns instantly with the new job_id while extraction runs.

@app.post("/api/upload", status_code=201)
async def upload(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported format: {ext}")

    job_id = str(uuid.uuid4())
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    video_path = UPLOAD_DIR / f"{job_id}{ext}"
    video_path.write_bytes(await file.read())

    _write_meta(job_id, {
        "id": job_id,
        "filename": file.filename,
        "video_path": str(video_path),
        "status": "uploaded",
        "faces": [],
    })

    background_tasks.add_task(_extract_frames, job_id)
    return {"job_id": job_id}


# --- Job status -------------------------------------------------------------

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return _read_meta(job_id)


# --- Face detection (stub — implementation in next step) -------------------

@app.post("/api/jobs/{job_id}/detect", status_code=202)
def detect_faces(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] != "frames_ready":
        raise HTTPException(
            status_code=409,
            detail=f"Detection requires status 'frames_ready', got '{meta['status']}'"
        )

    meta["status"] = "detecting"
    _write_meta(job_id, meta)

    # TODO: run OpenCV face detection over frames_dir
    return {"job_id": job_id, "status": "detecting"}


# --- Render blurred video (stub — implementation in next step) -------------

class RenderRequest(BaseModel):
    face_id: str


@app.post("/api/jobs/{job_id}/render", status_code=202)
def render(job_id: str, body: RenderRequest):
    meta = _read_meta(job_id)
    if meta["status"] != "detected":
        raise HTTPException(
            status_code=409,
            detail=f"Render requires status 'detected', got '{meta['status']}'"
        )

    meta["status"] = "rendering"
    meta["selected_face_id"] = body.face_id
    _write_meta(job_id, meta)

    # TODO: apply blur/black-box to frames and reassemble with FFmpeg
    return {"job_id": job_id, "status": "rendering"}


# --- Serve finished video ---------------------------------------------------

@app.get("/api/jobs/{job_id}/output")
def output_video(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] != "done":
        raise HTTPException(status_code=409, detail="Output not ready yet")

    output_path = Path(meta["output_path"])
    return FileResponse(output_path, media_type="video/mp4")
