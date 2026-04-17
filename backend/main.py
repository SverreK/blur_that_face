import os
import uuid
import json
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/btf/uploads"))
JOBS_DIR = Path(os.getenv("JOBS_DIR", "/tmp/btf/jobs"))
ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov"}

app = FastAPI(title="Blur That Face API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def _read_meta(job_id: str) -> dict:
    meta_path = _job_dir(job_id) / "meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    return json.loads(meta_path.read_text())


def _write_meta(job_id: str, data: dict) -> None:
    _job_dir(job_id).mkdir(parents=True, exist_ok=True)
    (_job_dir(job_id) / "meta.json").write_text(json.dumps(data))


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@app.post("/api/upload", status_code=201)
async def upload(file: UploadFile = File(...)):
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

    return {"job_id": job_id}


# ---------------------------------------------------------------------------
# Job status
# ---------------------------------------------------------------------------

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return _read_meta(job_id)


# ---------------------------------------------------------------------------
# Trigger face detection (stub — worker added in next step)
# ---------------------------------------------------------------------------

@app.post("/api/jobs/{job_id}/detect", status_code=202)
def detect_faces(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] != "uploaded":
        raise HTTPException(status_code=409, detail=f"Cannot detect from status '{meta['status']}'")

    meta["status"] = "detecting"
    _write_meta(job_id, meta)

    # TODO: kick off background face-detection worker
    return {"job_id": job_id, "status": "detecting"}


# ---------------------------------------------------------------------------
# Render blurred video (stub — worker added in next step)
# ---------------------------------------------------------------------------

class RenderRequest(BaseModel):
    face_id: str


@app.post("/api/jobs/{job_id}/render", status_code=202)
def render(job_id: str, body: RenderRequest):
    meta = _read_meta(job_id)

    meta["status"] = "rendering"
    meta["selected_face_id"] = body.face_id
    _write_meta(job_id, meta)

    # TODO: kick off background render worker
    return {"job_id": job_id, "status": "rendering"}


# ---------------------------------------------------------------------------
# Serve output video
# ---------------------------------------------------------------------------

@app.get("/api/jobs/{job_id}/output")
def output_video(job_id: str):
    meta = _read_meta(job_id)
    if meta["status"] != "done":
        raise HTTPException(status_code=409, detail="Output not ready")

    output_path = Path(meta["output_path"])
    return FileResponse(output_path, media_type="video/mp4")
