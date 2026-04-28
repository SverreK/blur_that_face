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
      and returns per-frame face bounding boxes with stable track_ids
    → sets status = "detected", writes face summary into meta.json

Client polling
--------------
  GET /api/jobs/{id}  →  meta.json as JSON
    status values: uploaded | detecting | detected | rendering | done | error

Export
------
  POST /api/jobs/{id}/export  →  render blurred output video in background
  GET  /api/jobs/{id}/output  →  stream finished video
"""

import cv2
import json
import numpy as np
import os
import subprocess
import uuid
import shutil
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from detector import run_detection

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/btf/uploads"))
JOBS_DIR   = Path(os.getenv("JOBS_DIR",   "/tmp/btf/jobs"))
DIST_DIR = Path(__file__).resolve().parent / "dist"

FFMPEG_PATH = shutil.which("ffmpeg") or "ffmpeg"

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
# Detection background task
# ---------------------------------------------------------------------------

def _run_detection(job_id: str) -> None:
    """
    Called as a FastAPI BackgroundTask after a successful upload.

    1. Marks job as 'detecting'.
    2. Runs the MediaPipe detector on the saved video.
    3. Assigns stable track_ids across frames via tracker.py.
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

        detections_out.write_text(json.dumps(results, indent=2))

        face_summary: dict[str, dict] = {}
        for frame in results["frames"]:
            for face in frame["faces"]:
                tid = face["track_id"]
                if tid not in face_summary:
                    face_summary[tid] = {
                        "track_id":    tid,
                        "first_frame": frame["frame"],
                        "last_frame":  frame["frame"],
                        "bbox_sample": face["bbox"],
                    }
                else:
                    face_summary[tid]["last_frame"] = frame["frame"]

        num_faces = len(face_summary)

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
def get_detections(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] not in ("detected", "rendering", "done"):
        raise HTTPException(status_code=409, detail="Detections not ready yet")
    detections_path = Path(meta["detections_path"])
    return FileResponse(detections_path, media_type="application/json")


@app.get("/api/jobs/{job_id}/faces/{track_id}/thumbnail")
def get_face_thumbnail(job_id: str, track_id: str):
    """
    Crop the detected face out of the frame where it first appears and return
    it as a JPEG.

    Steps:
      1. Look up the face's first_frame and bbox_sample from meta.json.
      2. Seek OpenCV to that frame — much faster than decoding every frame.
      3. Crop the bounding box, adding a small padding so the thumbnail
         shows a bit of context around the face.
      4. Encode in-memory as JPEG and return directly — no temp file needed.
    """
    meta = _read_meta(job_id)

    face_summary = next(
        (f for f in meta.get("faces", []) if f["track_id"] == track_id),
        None,
    )
    if face_summary is None:
        raise HTTPException(status_code=404, detail="Face not found")

    x, y, w, h = face_summary["bbox_sample"]
    first_frame  = face_summary["first_frame"]

    cap = cv2.VideoCapture(meta["video_path"])
    if not cap.isOpened():
        raise HTTPException(status_code=500, detail="Could not open video")

    cap.set(cv2.CAP_PROP_POS_FRAMES, first_frame)
    ok, frame = cap.read()
    cap.release()

    if not ok:
        raise HTTPException(status_code=500, detail="Could not decode frame")

    # Expand the crop by 20 % of the face size on each side so the thumbnail
    # shows forehead, chin and a little background — looks better than a
    # tight bbox that cuts off hair and ears.
    pad_x = int(w * 0.20)
    pad_y = int(h * 0.20)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(frame.shape[1], x + w + pad_x)
    y2 = min(frame.shape[0], y + h + pad_y)

    crop = frame[y1:y2, x1:x2]

    ok, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode thumbnail")

    return Response(content=buf.tobytes(), media_type="image/jpeg")


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
    format_name = ext.replace(".", "").upper()

    # Probe FPS and dimensions immediately so the frontend has correct values
    # before detection starts, rather than falling back to a hardcoded default.
    cap = cv2.VideoCapture(str(video_path))
    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
    cap.release()

    codec = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

    _write_meta(job_id, {
        "id":         job_id,
        "filename":   file.filename,
        "video_path": str(video_path),
        "status":     "uploaded",
        "fps":        fps,
        "width":      width,
        "height":     height,
        "format":     format_name,
        "codec":      codec,
        "faces":      [],
    })

    background_tasks.add_task(_run_detection, job_id)
    return {"job_id": job_id}


# --- Job status -------------------------------------------------------------

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return _read_meta(job_id)

# --- Export blurred video ---------------------------------------------------

class BlurSettingsModel(BaseModel):
    type: str        # "Gaussian" | "Pixelate" | "Solid mask"
    strength: float  # 0-100
    color: str       # "Neutral" | "Warm" | "Cool"
    padding: float   # 0-50, percentage of bbox dimension added each side
    shape: str       # "Rectangle" | "Ellipse"
    smoothing: str   # "None" | "Low" | "Medium" | "High"


class ExportRequest(BaseModel):
    blurred_faces: dict[str, BlurSettingsModel]


_SMOOTHING_SIGMA = {"None": 0, "Low": 3, "Medium": 7, "High": 15}


def _apply_blur_region(frame: np.ndarray, bbox: list, settings: BlurSettingsModel) -> np.ndarray:
    fh, fw = frame.shape[:2]
    x, y, w, h = bbox

    pad_x = int(w * settings.padding / 100)
    pad_y = int(h * settings.padding / 100)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(fw, x + w + pad_x)
    y2 = min(fh, y + h + pad_y)

    if x2 <= x1 or y2 <= y1:
        return frame

    roi = frame[y1:y2, x1:x2].copy()
    rh, rw = roi.shape[:2]

    blur_type = settings.type
    strength  = settings.strength / 100.0  # 0-1

    if blur_type == "Gaussian":
        sigma = max(1, int(strength * 60))
        if sigma % 2 == 0:
            sigma += 1
        processed = cv2.GaussianBlur(roi, (sigma, sigma), 0)
    elif blur_type == "Pixelate":
        # Map 0-100% → 4-64px block size (larger = more pixelated)
        block_size = max(4, int(4 + strength * 60))
        pix_w = max(1, rw // block_size)
        pix_h = max(1, rh // block_size)
        small = cv2.resize(roi, (pix_w, pix_h), interpolation=cv2.INTER_LINEAR)
        processed = cv2.resize(small, (rw, rh), interpolation=cv2.INTER_NEAREST)
    else:  # Solid mask
        color_map = {
            "Neutral": (0, 0, 0),       # BGR
            "Warm":    (0, 20, 60),      # BGR
            "Cool":    (60, 20, 0),      # BGR
        }
        color_bgr = color_map.get(settings.color, (0, 0, 0))
        solid = np.full_like(roi, color_bgr, dtype=np.uint8)
        alpha = 0.4 + strength * 0.6
        processed = cv2.addWeighted(solid, alpha, roi, 1 - alpha, 0)

    smooth_sigma = _SMOOTHING_SIGMA.get(settings.smoothing, 0)
    if smooth_sigma > 0:
        mask = np.zeros((rh, rw), dtype=np.float32)
        if settings.shape == "Ellipse":
            cv2.ellipse(mask, (rw // 2, rh // 2), (rw // 2, rh // 2), 0, 0, 360, 1.0, -1)
        else:
            mask[:] = 1.0
        k = smooth_sigma * 2 + 1
        mask = cv2.GaussianBlur(mask, (k, k), smooth_sigma)
        mask3 = mask[:, :, np.newaxis]
        processed = (processed * mask3 + roi * (1 - mask3)).astype(np.uint8)
    elif settings.shape == "Ellipse":
        mask = np.zeros((rh, rw), dtype=np.uint8)
        cv2.ellipse(mask, (rw // 2, rh // 2), (rw // 2, rh // 2), 0, 0, 360, 255, -1)
        processed = np.where(mask[:, :, np.newaxis] == 255, processed, roi)

    frame[y1:y2, x1:x2] = processed
    return frame


def _run_export(job_id: str, blurred_faces: dict[str, BlurSettingsModel]) -> None:
    meta = _read_meta(job_id)
    try:
        video_path      = Path(meta["video_path"])
        detections_path = Path(meta["detections_path"])
        detections      = json.loads(detections_path.read_text())

        # Index detections by frame number for O(1) lookup
        frame_index: dict[int, list] = {
            fd["frame"]: fd["faces"] for fd in detections["frames"]
        }

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError("Could not open source video")

        fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        job_dir     = _job_dir(job_id)
        raw_out     = job_dir / "output_noaudio.mp4"
        final_out   = job_dir / "output.mp4"

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(raw_out), fourcc, fps, (width, height))

        frame_idx = 0
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break

            faces_in_frame = frame_index.get(frame_idx, [])
            for face in faces_in_frame:
                tid      = face.get("track_id")
                settings = blurred_faces.get(tid)
                if settings is not None:
                    frame = _apply_blur_region(frame, face["bbox"], settings)

            writer.write(frame)

            if frame_idx % 30 == 0:
                m = _read_meta(job_id)
                m["frame_progress"] = {"current": frame_idx, "total": total_frames}
                _write_meta(job_id, m)

            frame_idx += 1

        cap.release()
        writer.release()
        
        result = subprocess.run(
            [
                FFMPEG_PATH, "-y",
                "-i", str(raw_out),
                "-i", str(video_path),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0?",
                "-shortest",
                str(final_out),
            ],
            capture_output=True,
            timeout=300,
        )

        raw_out.unlink(missing_ok=True)

        if result.returncode != 0 and not final_out.exists():
            # ffmpeg failed and produced no output — fall back to video-only file
            shutil.copy(str(raw_out if raw_out.exists() else raw_out), str(final_out))

        meta = _read_meta(job_id)
        meta.update({
            "status":         "done",
            "output_path":    str(final_out),
            "frame_progress": None,
        })
        _write_meta(job_id, meta)

    except Exception as exc:
        meta = _read_meta(job_id)
        meta["status"] = "error"
        meta["error"]  = str(exc)
        _write_meta(job_id, meta)
        raise


@app.post("/api/jobs/{job_id}/export", status_code=202)
def export_video(job_id: str, body: ExportRequest, background_tasks: BackgroundTasks):
    meta = _read_meta(job_id)
    if meta["status"] not in ("detected", "done"):
        raise HTTPException(
            status_code=409,
            detail=f"Export requires status 'detected' or 'done', got '{meta['status']}'",
        )

    meta["status"] = "rendering"
    _write_meta(job_id, meta)

    background_tasks.add_task(_run_export, job_id, body.blurred_faces)
    return {"job_id": job_id, "status": "rendering"}


# --- Serve finished video ---------------------------------------------------

@app.get("/api/jobs/{job_id}/output")
def output_video(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] != "done":
        raise HTTPException(status_code=409, detail="Output not ready yet")

    output_path = Path(meta["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found")
    return FileResponse(output_path, media_type="video/mp4")

@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse(DIST_DIR / "index.html")

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
