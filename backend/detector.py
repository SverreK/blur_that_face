import cv2
import json
import os
import mediapipe as mp
from pathlib import Path
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from tracker import run_tracking

# The Tasks API requires its own model format — different from the legacy
# blaze_face_full_range.tflite used by mp.solutions.face_detection.
# The Dockerfile downloads blaze_face_short_range.tflite from the official
# MediaPipe model card during image build so the container runs fully offline.
DEFAULT_MODEL_PATH = Path(os.getenv(
    "FACE_MODEL_PATH",
    str(Path(__file__).parent / "blaze_face_short_range.tflite"),
))

MIN_CONFIDENCE = float(os.getenv("FACE_MIN_CONFIDENCE", "0.5"))
MIN_SUPPRESSION = float(os.getenv("FACE_MIN_SUPPRESSION", "0.3"))


def _parse_detections(detection_result, frame_idx: int) -> dict:
    """
    Convert a Tasks-API DetectionResult into a plain dict.
    Bounding box values are already in absolute pixels with this API,
    unlike mp.solutions which returns relative 0–1 coordinates.
    """
    faces = []
    for detection in detection_result.detections:
        bbox  = detection.bounding_box
        score = detection.categories[0].score
        faces.append({
            "bbox":       [bbox.origin_x, bbox.origin_y, bbox.width, bbox.height],
            "confidence": float(score),
        })
    return {"frame": frame_idx, "faces": faces}


def run_detection(
    video_path: str | Path,
    output_path: str | Path,
    model_path: str | Path = DEFAULT_MODEL_PATH,
    progress_cb=None,
) -> dict:
    """
    Run MediaPipe Tasks face detection on every frame of *video_path*.

    Returns the results dict and also writes it to *output_path* as JSON.
    *progress_cb(frame_idx, total_frames)* is called after every frame when provided.
    """
    options = mp_vision.FaceDetectorOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp_vision.RunningMode.VIDEO,
        min_detection_confidence=MIN_CONFIDENCE,
        min_suppression_threshold=MIN_SUPPRESSION,
    )

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps          = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    results: dict = {
        "video": {
            "path":         str(video_path),
            "fps":          fps,
            "width":        width,
            "height":       height,
            "total_frames": total_frames,
        },
        "frames": [],
    }

    with mp_vision.FaceDetector.create_from_options(options) as detector:
        frame_idx = 0
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            # VIDEO mode requires strictly monotonically increasing timestamps.
            timestamp_ms = int((frame_idx / fps) * 1000)
            detection_result = detector.detect_for_video(mp_image, timestamp_ms)

            results["frames"].append(_parse_detections(detection_result, frame_idx))

            if progress_cb:
                progress_cb(frame_idx, total_frames)

            frame_idx += 1

    cap.release()

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(results, indent=2))

    tracked = run_tracking(results, video_path)
    output_path.write_text(json.dumps(tracked, indent=2))

    return tracked


if __name__ == "__main__":
    import sys
    video = sys.argv[1] if len(sys.argv) > 1 else "video.mp4"
    out   = sys.argv[2] if len(sys.argv) > 2 else "detections.json"
    run_detection(video, out)
