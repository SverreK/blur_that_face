"""
IoU-based face tracker with shot-change detection.

Intended as a post-processing step that reads the raw per-frame detections
produced by detector.py and adds a stable track_id to every face.

Input format  (same as detector.py output):
  {
    "video": { ... },
    "frames": [
      {"frame": 0, "faces": [{"bbox": [x, y, w, h], "confidence": 0.97}]}
    ]
  }

Output format  (track_id added to each face, everything else unchanged):
  {
    "video": { ... },
    "frames": [
      {"frame": 0, "faces": [{"track_id": "t1", "bbox": [...], "confidence": 0.97}]}
    ]
  }

Pipeline:
  1. Detect shot cuts from the video (mean pixel diff between consecutive frames).
  2. For each frame, match detections to active tracks via IoU (pass 1) then
     centroid distance (pass 2) as a fallback for re-appearing faces.
  3. On a shot cut, immediately close all active tracks so they are not
     incorrectly continued across scene boundaries.
  4. Merge track fragments that were split within the same shot (e.g. a person
     looked down briefly). Never merge across shot boundaries.
  5. Filter out any track that appears in fewer than MIN_TRACK_LENGTH frames
     — these are background detections or single-frame noise.
"""

import copy
import math
import cv2
from pathlib import Path


# ---------------------------------------------------------------------------
# Tuning constants
# ---------------------------------------------------------------------------

IOU_THRESHOLD             = 0.3
CENTROID_DIST_THRESHOLD   = 150.0
MAX_MISSED_FRAMES_NORMAL  = 48
MAX_MISSED_FRAMES_CUT     = 0
MIN_TRACK_LENGTH          = 48
SHOT_CHANGE_THRESHOLD     = 30.0

MERGE_MAX_GAP             = 40
MERGE_MAX_DIST            = 200.0
MERGE_SIZE_RATIO_MIN      = 0.5
MERGE_SIZE_RATIO_MAX      = 2.0


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _iou(a: list, b: list) -> float:
    ix1 = max(a[0], b[0])
    iy1 = max(a[1], b[1])
    ix2 = min(a[0] + a[2], b[0] + b[2])
    iy2 = min(a[1] + a[3], b[1] + b[3])

    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter == 0.0:
        return 0.0

    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union > 0.0 else 0.0


def _centroid_dist(a: list, b: list) -> float:
    ax, ay = a[0] + a[2] / 2, a[1] + a[3] / 2
    bx, by = b[0] + b[2] / 2, b[1] + b[3] / 2
    return math.hypot(ax - bx, ay - by)


# ---------------------------------------------------------------------------
# Shot-change detection
# ---------------------------------------------------------------------------

def _find_shot_cuts(video_path: str | Path,
                    threshold: float = SHOT_CHANGE_THRESHOLD) -> set[int]:
    cap = cv2.VideoCapture(str(video_path))
    cuts: set[int] = set()
    prev_gray = None
    frame_idx = 0

    while cap.isOpened():
        ok, frame = cap.read()
        if not ok:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if prev_gray is not None:
            diff = cv2.absdiff(gray, prev_gray).mean()
            if diff > threshold:
                cuts.add(frame_idx)

        prev_gray = gray
        frame_idx += 1

    cap.release()
    return cuts


# ---------------------------------------------------------------------------
# Within-shot track merging
# ---------------------------------------------------------------------------

def _merge_within_shots(
    frames: list[dict],
    shot_cuts: set[int],
    max_gap: int          = MERGE_MAX_GAP,
    max_dist: float       = MERGE_MAX_DIST,
    size_ratio_min: float = MERGE_SIZE_RATIO_MIN,
    size_ratio_max: float = MERGE_SIZE_RATIO_MAX,
) -> list[dict]:
    """
    Reconnect track fragments that were split within the same shot.
    Never merges tracks that have a shot cut between them.
    """
    # ── Build per-track summary ───────────────────────────────────────────
    stats: dict[str, dict] = {}
    for fd in frames:
        fi = fd["frame"]
        for face in fd["faces"]:
            tid = face["track_id"]
            if tid not in stats:
                stats[tid] = {
                    "first_frame": fi,
                    "last_frame":  fi,
                    "first_bbox":  face["bbox"],
                    "last_bbox":   face["bbox"],
                }
            else:
                stats[tid]["last_frame"] = fi
                stats[tid]["last_bbox"]  = face["bbox"]

    track_ids = list(stats.keys())

    # ── Union-find ─────────────────────────────────────────────────────────
    parent: dict[str, str] = {tid: tid for tid in track_ids}

    def find(tid: str) -> str:
        while parent[tid] != tid:
            parent[tid] = parent[parent[tid]]
            tid = parent[tid]
        return tid

    def union(child: str, root: str) -> None:
        parent[find(child)] = find(root)

    # ── Match each track B to the best predecessor A ───────────────────────
    for b_id in track_ids:
        b = stats[b_id]
        best_a_id: str | None = None
        best_score            = float("inf")

        for a_id in track_ids:
            if a_id == b_id:
                continue

            a   = stats[a_id]
            gap = b["first_frame"] - a["last_frame"]

            if not (0 < gap <= max_gap):
                if 0 < gap <= 100:  # only log near-misses, not distant tracks
                    print(f"  SKIP merge {a_id}→{b_id}: gap={gap} > {max_gap}")
                continue
            
            # Never merge across a shot cut
            cut_between = any(
                a["last_frame"] < cut_frame <= b["first_frame"]
                for cut_frame in shot_cuts
            )
            if cut_between:
                print(f"  SKIP merge {a_id}→{b_id}: cut between frames {a['last_frame']}–{b['first_frame']}")
                continue

            dist = _centroid_dist(a["last_bbox"], b["first_bbox"])
            if dist > max_dist:
                print(f"  SKIP merge {a_id}→{b_id}: dist={dist:.0f} > {max_dist}")
                continue

            a_w, a_h = a["last_bbox"][2], a["last_bbox"][3]
            b_w, b_h = b["first_bbox"][2], b["first_bbox"][3]
            if a_w == 0 or a_h == 0:
                continue

            ratio_w = b_w / a_w
            ratio_h = b_h / a_h
            if not (size_ratio_min <= ratio_w <= size_ratio_max):
                print(f"  SKIP merge {a_id}→{b_id}: ratio_w={ratio_w:.2f} out of range")
                continue
            if not (size_ratio_min <= ratio_h <= size_ratio_max):
                print(f"  SKIP merge {a_id}→{b_id}: ratio_h={ratio_h:.2f} out of range")
                continue

            print(f"  MERGE candidate {a_id}→{b_id}: gap={gap}, dist={dist:.0f}, ratio_w={ratio_w:.2f}, ratio_h={ratio_h:.2f}")

            score = gap + dist * 0.01
            if score < best_score:
                best_score = score
                best_a_id  = a_id

        if best_a_id is not None:
            union(b_id, best_a_id)

    # ── Apply remapping ───────────────────────────────────────────────────
    merged_frames = []
    for fd in frames:
        merged_faces = []
        for face in fd["faces"]:
            updated = copy.copy(face)
            updated["track_id"] = find(face["track_id"])
            merged_faces.append(updated)
        merged_frames.append({"frame": fd["frame"], "faces": merged_faces})

    return merged_frames


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_tracking(raw: dict, video_path: str | Path) -> dict:
    shot_cuts = _find_shot_cuts(video_path)
    print(f"Shot cuts detected at frames: {sorted(shot_cuts)}")

    next_num: int = 1
    active: list[dict] = []
    result_frames: list[dict] = []
    last_cut_frame = -999

    for frame_data in raw["frames"]:
        frame_idx = frame_data["frame"]
        dets      = frame_data["faces"]

        # ── Shot cut: close all tracks ────────────────────────────────────
        if frame_idx in shot_cuts:
            active = []
            last_cut_frame = frame_idx
        else:
            frames_since_cut = frame_idx - last_cut_frame
            timeout = MAX_MISSED_FRAMES_CUT if frames_since_cut < 5 else MAX_MISSED_FRAMES_NORMAL
            active = [t for t in active if t["missed"] <= timeout]

        n_dets   = len(dets)
        n_active = len(active)

        det_to_tid:     dict[int, str] = {}
        assignments:    dict[int, int] = {}
        matched_dets:   set[int]       = set()
        matched_tracks: set[int]       = set()

        # ── Pass 1: IoU matching ──────────────────────────────────────────
        iou_scored: list[tuple[float, int, int]] = []
        for di in range(n_dets):
            for ti in range(n_active):
                score = _iou(dets[di]["bbox"], active[ti]["bbox"])
                if score > IOU_THRESHOLD:
                    iou_scored.append((score, di, ti))

        for _s, di, ti in sorted(iou_scored, reverse=True):
            if di not in matched_dets and ti not in matched_tracks:
                assignments[di]  = ti
                det_to_tid[di]   = active[ti]["track_id"]
                matched_dets.add(di)
                matched_tracks.add(ti)

        # ── Pass 2: centroid fallback (disabled near cuts) ────────────────
        if frame_idx - last_cut_frame > 10:
            dist_scored: list[tuple[float, int, int]] = []
            for di in range(n_dets):
                if di in matched_dets:
                    continue
                for ti in range(n_active):
                    if ti in matched_tracks:
                        continue
                    dist = _centroid_dist(dets[di]["bbox"], active[ti]["bbox"])
                    if dist < CENTROID_DIST_THRESHOLD:
                        dist_scored.append((dist, di, ti))

            for _, di, ti in sorted(dist_scored):
                if di not in matched_dets and ti not in matched_tracks:
                    assignments[di]  = ti
                    det_to_tid[di]   = active[ti]["track_id"]
                    matched_dets.add(di)
                    matched_tracks.add(ti)

        # ── Update matched tracks ─────────────────────────────────────────
        for di, ti in assignments.items():
            active[ti]["bbox"]   = dets[di]["bbox"]
            active[ti]["missed"] = 0

        # ── Age unmatched tracks ──────────────────────────────────────────
        for ti in range(n_active):
            if ti not in matched_tracks:
                active[ti]["missed"] += 1

        # ── Open new tracks ───────────────────────────────────────────────
        for di in range(n_dets):
            if di not in matched_dets:
                tid = f"t{next_num}"
                next_num += 1
                det_to_tid[di] = tid
                active.append({"track_id": tid, "bbox": dets[di]["bbox"], "missed": 0})

        # ── Build output frame ────────────────────────────────────────────
        output_faces = []
        for di, det in enumerate(dets):
            face = copy.copy(det)
            face["track_id"] = det_to_tid[di]
            output_faces.append(face)

        result_frames.append({"frame": frame_idx, "faces": output_faces})

    # ── Merge fragments within same shot ──────────────────────────────────
    result_frames = _merge_within_shots(result_frames, shot_cuts)

    # ── Filter short tracks ───────────────────────────────────────────────
    track_lengths: dict[str, int] = {}
    for fd in result_frames:
        for face in fd["faces"]:
            tid = face["track_id"]
            track_lengths[tid] = track_lengths.get(tid, 0) + 1

    for tid, length in sorted(track_lengths.items(), key=lambda x: x[1], reverse=True):
        if length >= MIN_TRACK_LENGTH:
            print(f"  Track {tid}: {length} frames")

    filtered_frames = []
    for fd in result_frames:
        filtered_frames.append({
            "frame": fd["frame"],
            "faces": [
                face for face in fd["faces"]
                if track_lengths.get(face["track_id"], 0) >= MIN_TRACK_LENGTH
            ],
        })

    return {"video": raw.get("video", {}), "frames": filtered_frames}