import { useRef, useEffect } from "react";
import { useVideoFrame } from "../hooks/useVideoFrame";
import type { BlurColor, BlurSettings, BlurShape, BlurSmoothing, DetectionData } from "../types";

type VideoPlayerProps = {
  videoUrl: string;
  fps: number;
  detections: DetectionData | null;
  blurredFaces?: Record<number, BlurSettings>;
  onTimeUpdate?: (time: number) => void;
  onLoadedMetadata?: (duration: number) => void;
};

// How quickly a smoothed position chases the raw detection each frame.
// 1.0 = instant snap; 0.15 = very heavy smoothing (slow to catch up).
const SMOOTHING_FACTOR: Record<BlurSmoothing, number> = {
  None:   1.0,
  Low:    0.6,
  Medium: 0.35,
  High:   0.15,
};

export default function VideoPlayer({
  videoUrl,
  fps,
  detections,
  blurredFaces = {},
  onTimeUpdate,
  onLoadedMetadata,
}: VideoPlayerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFrame = useVideoFrame(videoRef, { fps });

  // Stores the last interpolated [x, y, w, h] for each face_id.
  // A plain ref avoids re-renders while still persisting across draw ticks.
  const smoothedPos = useRef<Record<number, [number, number, number, number]>>({});
  // Used to detect seeks so we can reset smoothed positions.
  const prevFrame = useRef<number>(-1);

  // ── Sync canvas resolution to the video's native size ──────────────────
  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function syncSize() {
      if (!video || !canvas) return;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    video.addEventListener("loadedmetadata", syncSize);
    if (video.readyState >= 1) syncSize();
    return () => video.removeEventListener("loadedmetadata", syncSize);
  }, [videoUrl]);

  // ── Draw overlays every frame ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detections) return;

    const frameData = detections.frames[currentFrame];
    if (!frameData?.faces.length) return;

    // If the frame index jumped by more than 5 (user seeked), stale smoothed
    // positions would cause the box to slide across the screen from the old
    // location. Reset them so they snap to the new position immediately.
    if (Math.abs(currentFrame - prevFrame.current) > 5) {
      smoothedPos.current = {};
    }
    prevFrame.current = currentFrame;

    for (const face of frameData.faces) {
      const [rawX, rawY, rawW, rawH] = face.bbox;
      const settings = blurredFaces[face.face_id];

      // ── Smoothing ──────────────────────────────────────────────────────
      // Lerp the smoothed position toward the raw detection.
      // Blurred faces use their stored smoothing; unblurred preview boxes
      // always use Low so they don't jitter either.
      const factor = SMOOTHING_FACTOR[settings?.smoothing ?? "Low"];
      const [px, py, pw, ph] = smoothedPos.current[face.face_id] ?? [rawX, rawY, rawW, rawH];
      const sx = lerp(px, rawX, factor);
      const sy = lerp(py, rawY, factor);
      const sw = lerp(pw, rawW, factor);
      const sh = lerp(ph, rawH, factor);
      smoothedPos.current[face.face_id] = [sx, sy, sw, sh];

      if (settings) {
        // ── Padding ───────────────────────────────────────────────────────
        // Expand the smoothed box by `padding %` of its own size on every
        // side. BlazeFace boxes are often tight (forehead / chin clipped),
        // so a 10-20 % pad ensures the face is fully hidden.
        const padX = (sw * settings.padding) / 100;
        const padY = (sh * settings.padding) / 100;
        const bx = sx - padX;
        const by = sy - padY;
        const bw = sw + padX * 2;
        const bh = sh + padY * 2;

        drawBlur(ctx, video, bx, by, bw, bh, settings);
      } else {
        // Yellow detection preview — raw smoothed position, no padding
        drawDetectionBox(ctx, sx, sy, sw, sh, face.face_id);
      }
    }
  }, [currentFrame, detections, blurredFaces]);

  return (
    <div className="relative inline-block w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="block w-full"
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 h-full w-full pointer-events-none"
      />
    </div>
  );
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawDetectionBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  faceId: number,
) {
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth   = 3;
  ctx.font        = "bold 14px sans-serif";
  ctx.fillStyle   = "#facc15";
  ctx.strokeRect(x, y, w, h);
  ctx.fillText(`Face ${faceId}`, x + 4, y - 6 > 0 ? y - 6 : y + 16);
}

// Clip the canvas context to either a rectangle or an ellipse.
// All three blur types call this before drawing so the effect stays
// within the (padded, possibly elliptical) box boundary.
function clipToShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  shape: BlurShape,
) {
  ctx.beginPath();
  if (shape === "Ellipse") {
    // cx/cy = centre, rx/ry = half-dimensions, rotation = 0, full circle
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
}

function drawBlur(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number, y: number, w: number, h: number,
  settings: BlurSettings,
) {
  switch (settings.type) {
    case "Gaussian":   drawGaussian(ctx, video, x, y, w, h, settings); break;
    case "Pixelate":   drawPixelate(ctx, video, x, y, w, h, settings); break;
    case "Solid mask": drawSolid(ctx,           x, y, w, h, settings); break;
  }
}

function drawGaussian(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number, y: number, w: number, h: number,
  { strength, shape }: BlurSettings,
) {
  // Map 0-100 % → 2-30 px blur radius.
  const blurPx  = Math.round(2 + (strength / 100) * 28);
  // Draw a padded region from the video so the kernel has real edge pixels
  // to sample from — without this the blur darkens at the clip boundary.
  const overlap = blurPx * 2;

  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  clipToShape(ctx, x, y, w, h, shape);

  const sx = Math.max(0, x - overlap);
  const sy = Math.max(0, y - overlap);
  const sw = Math.min(video.videoWidth  - sx, w + overlap * 2);
  const sh = Math.min(video.videoHeight - sy, h + overlap * 2);
  ctx.drawImage(video, sx, sy, sw, sh, sx, sy, sw, sh);

  ctx.restore();
}

function drawPixelate(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number, y: number, w: number, h: number,
  { strength, shape }: BlurSettings,
) {
  // Map 0-100 % → 4-32 px block size. Larger blocks = more pixelated.
  const blockSize = Math.max(4, Math.round(4 + (strength / 100) * 28));
  const pixW = Math.max(1, Math.round(w / blockSize));
  const pixH = Math.max(1, Math.round(h / blockSize));

  // Step 1 — downsample the face region to a few pixels
  const tmp    = document.createElement("canvas");
  tmp.width    = pixW;
  tmp.height   = pixH;
  tmp.getContext("2d")!.drawImage(video, x, y, w, h, 0, 0, pixW, pixH);

  // Step 2 — upscale back with nearest-neighbour to get hard pixel blocks,
  // clipped to the chosen shape so it respects ellipse outlines.
  ctx.save();
  clipToShape(ctx, x, y, w, h, shape);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, pixW, pixH, x, y, w, h);
  ctx.restore();
}

function drawSolid(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  { color, strength, shape }: BlurSettings,
) {
  // Strength maps 0-100 % → opacity 0.4-1.0 so even at 0 there's a visible mark.
  const opacity = 0.4 + (strength / 100) * 0.6;
  const colorMap: Record<BlurColor, string> = {
    Neutral: `rgba(0,   0,   0,   ${opacity})`,
    Warm:    `rgba(60,  20,  0,   ${opacity})`,
    Cool:    `rgba(0,   20,  60,  ${opacity})`,
  };

  ctx.save();
  ctx.fillStyle = colorMap[color];

  if (shape === "Ellipse") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }

  ctx.restore();
}
