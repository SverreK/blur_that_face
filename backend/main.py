"""
Blur That Face — FastAPI backend

Upload flow
-----------
  POST /api/upload
    → save video to disk
    → immediately kick off _run_detection as a BackgroundTask
    → return { job_id } to the client

Detection background task
--------------------------
  _run_detection(job_id)
    → sets status = "detecting"
    → calls detector.run_detection(), which reads the video with OpenCV
      and returns per-frame face bounding boxes
    → assigns a stable integer face_id to every unique face track (naïve
      nearest-neighbour for now; a proper tracker comes in the next step)
    → sets status = "detected", writes face summary into meta.json

Client polling
--------------
  GET /api/jobs/{id}  →  meta.json as JSON
    status values: uploaded | detecting | detected | rendering | done | error

Later steps (stubs for now)
----------------------------
  POST /api/jobs/{id}/render  →  produce blurred output video
  GET  /api/jobs/{id}/output  →  stream finished video
"""

import cv2
import json
import os
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from detector import run_detection

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/btf/uploads"))
JOBS_DIR   = Path(os.getenv("JOBS_DIR",   "/tmp/btf/jobs"))

ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov"}

# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="Blur That Face API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Meta-data helpers
#
# Every job lives in JOBS_DIR/<job_id>/
#   meta.json        — all mutable job state (status, face summary, …)
#   detections.json  — full per-frame output from the detector
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
# Face-ID assignment
#
# MediaPipe gives us raw per-frame bounding boxes but no cross-frame IDs.
# This naïve pass assigns a stable integer face_id by matching each box in
# frame N to the nearest box seen in frame N-1 (IoU centre distance).
# A proper tracker (SORT/DeepSORT) replaces this in a later step.
# ---------------------------------------------------------------------------

def _iou_center_dist(a: list, b: list) -> float:
    """Euclidean distance between centres of two [x, y, w, h] boxes."""
    ax, ay = a[0] + a[2] / 2, a[1] + a[3] / 2
    bx, by = b[0] + b[2] / 2, b[1] + b[3] / 2
    return ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5


def _assign_face_ids(frames: list[dict], max_dist: float = 80.0) -> tuple[list[dict], int]:
    """
    Annotate every face dict in *frames* with a stable ``face_id`` integer.
    Returns (annotated_frames, total_unique_faces).
    """
    next_id = 0
    prev_faces: list[dict] = []   # faces seen in the previous frame

    for frame in frames:
        current: list[dict] = frame["faces"]
        matched_ids: set[int] = set()

        for face in current:
            best_id   = None
            best_dist = max_dist

            for prev in prev_faces:
                d = _iou_center_dist(face["bbox"], prev["bbox"])
                if d < best_dist and prev["face_id"] not in matched_ids:
                    best_dist = d
                    best_id   = prev["face_id"]

            if best_id is None:
                best_id = next_id
                next_id += 1

            face["face_id"] = best_id
            matched_ids.add(best_id)

        prev_faces = current

    return frames, next_id


# ---------------------------------------------------------------------------
# Detection background task
# ---------------------------------------------------------------------------

def _run_detection(job_id: str) -> None:
    """
    Called as a FastAPI BackgroundTask after a successful upload.

    1. Marks job as 'detecting'.
    2. Runs the MediaPipe detector on the saved video.
    3. Assigns stable face_ids across frames.
    4. Writes a compact face summary into meta.json and the full results
       into detections.json.
    5. Marks job as 'detected' (or 'error' on failure).
    """
    meta = _read_meta(job_id)
    meta["status"] = "detecting"
    _write_meta(job_id, meta)

    try:
        video_path     = Path(meta["video_path"])
        detections_out = _job_dir(job_id) / "detections.json"

        # Provide a progress callback that updates frame_progress in meta
        # every 30 frames so the frontend can show a rough % bar.
        def _progress(frame_idx: int, total: int) -> None:
            if frame_idx % 30 == 0:
                m = _read_meta(job_id)
                m["frame_progress"] = {"current": frame_idx, "total": total}
                _write_meta(job_id, m)

        results = run_detection(
            video_path=video_path,
            output_path=detections_out,
            progress_cb=_progress,
        )

        # Assign stable face_ids across frames. _assign_face_ids mutates
        # results["frames"] in-place, so we rewrite detections.json afterwards
        # so the /detections endpoint returns face_id-annotated data.
        annotated_frames, num_faces = _assign_face_ids(results["frames"])
        detections_out.write_text(json.dumps(results, indent=2))

        # face_summary: { face_id -> { first_frame, last_frame, bbox_sample } }
        face_summary: dict[int, dict] = {}
        for frame in annotated_frames:
            for face in frame["faces"]:
                fid = face["face_id"]
                if fid not in face_summary:
                    face_summary[fid] = {
                        "face_id": fid,
                        "first_frame": frame["frame"],
                        "last_frame":  frame["frame"],
                        "bbox_sample": face["bbox"],
                    }
                else:
                    face_summary[fid]["last_frame"] = frame["frame"]

        meta.update({
            "status":       "detected",
            "fps":          results["video"]["fps"],
            "total_frames": results["video"]["total_frames"],
            "width":        results["video"]["width"],
            "height":       results["video"]["height"],
            "num_faces":    num_faces,
            "faces":        list(face_summary.values()),
            "detections_path": str(detections_out),
            "frame_progress": None,
        })
        _write_meta(job_id, meta)

    except Exception as exc:
        meta["status"] = "error"
        meta["error"]  = str(exc)
        _write_meta(job_id, meta)
        raise


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

_MEDIA_TYPES = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}

@app.get("/api/jobs/{job_id}/video")
def get_video(job_id: str):
    meta = _read_meta(job_id)
    video_path = Path(meta["video_path"])
    media_type = _MEDIA_TYPES.get(video_path.suffix.lower(), "video/mp4")
    return FileResponse(video_path, media_type=media_type)

@app.get("/api/jobs/{job_id}/detections")
async def get_detections(job_id: str):
    meta = _read_meta(job_id)
    detections_path = meta.get("detections_path")
    
    if not detections_path or not Path(detections_path).exists():
        raise HTTPException(status_code=404, detail="Detections not ready")
    
    with open(detections_path) as f:
        return json.load(f)

@app.get("/api/jobs/{job_id}/detections")
def get_detections(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] not in ("detected", "rendering", "done"):
        raise HTTPException(status_code=409, detail="Detections not ready yet")
    detections_path = Path(meta["detections_path"])
    return FileResponse(detections_path, media_type="application/json")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Upload -----------------------------------------------------------------
#
# Saves the video and immediately registers a background detection task.
# The HTTP response returns as soon as the file is written — the client
# polls GET /api/jobs/{id} to follow progress.

@app.post("/api/upload", status_code=201)
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported format: {ext}")

    job_id = str(uuid.uuid4())
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    video_path = UPLOAD_DIR / f"{job_id}{ext}"
    video_path.write_bytes(await file.read())

    # Probe FPS and dimensions immediately so the frontend has correct values
    # before detection starts, rather than falling back to a hardcoded default.
    cap = cv2.VideoCapture(str(video_path))
    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    _write_meta(job_id, {
        "id":         job_id,
        "filename":   file.filename,
        "video_path": str(video_path),
        "status":     "uploaded",
        "fps":        fps,
        "width":      width,
        "height":     height,
        "faces":      [],
    })

    background_tasks.add_task(_run_detection, job_id)
    return {"job_id": job_id}


# --- Job status -------------------------------------------------------------

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return _read_meta(job_id)


# --- Render blurred video (stub) -------------------------------------------

class RenderRequest(BaseModel):
    face_id: int


@app.post("/api/jobs/{job_id}/render", status_code=202)
def render(job_id: str, body: RenderRequest):
    meta = _read_meta(job_id)
    if meta["status"] != "detected":
        raise HTTPException(
            status_code=409,
            detail=f"Render requires status 'detected', got '{meta['status']}'",
        )

    meta["status"]           = "rendering"
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
