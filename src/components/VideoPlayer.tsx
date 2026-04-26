import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useVideoFrame } from '../hooks/useVideoFrame';
import type {
  BlurColor,
  BlurSettings,
  BlurShape,
  BlurSmoothing,
  DetectionData,
} from '../types';

type VideoPlayerProps = {
  videoUrl: string;
  fps: number;
  detections: DetectionData | null;
  blurredFaces?: Record<string, BlurSettings>;
  onTimeUpdate?: (time: number) => void;
  onLoadedMetadata?: (duration: number) => void;
};

export interface VideoPlayerHandle {
  seekTo: (time: number) => void;
}

// How quickly a smoothed position chases the raw detection each frame.
// 1.0 = instant snap; 0.15 = very heavy smoothing (slow to catch up).
const SMOOTHING_FACTOR: Record<BlurSmoothing, number> = {
  None: 1.0,
  Low: 0.6,
  Medium: 0.35,
  High: 0.15,
};

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoUrl,
      fps,
      detections,
      blurredFaces = {},
      onTimeUpdate,
      onLoadedMetadata,
    },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const currentFrame = useVideoFrame(videoRef, { fps });

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo(time: number) {
        if (!videoRef.current) return;
        videoRef.current.currentTime = time;
      },
    }));

    // Stores the last interpolated [x, y, w, h] for each face_id.
    // A plain ref avoids re-renders while still persisting across draw ticks.
    const smoothedPos = useRef<
      Record<string, [number, number, number, number]>
    >({});
    // Used to detect seeks so we can reset smoothed positions.
    const prevFrame = useRef<number>(-1);

    // ── Sync play/pause and volume state with the video element ───────────────
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onVolumeChange = () => {
        setIsMuted(video.muted);
        setVolume(video.volume);
      };

      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('volumechange', onVolumeChange);
      return () => {
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('volumechange', onVolumeChange);
      };
    }, []);

    // ── Fullscreen: track state and keep canvas in the fullscreen tree ─────────
    useEffect(() => {
      function handleFullscreenChange() {
        setIsFullscreen(!!document.fullscreenElement);
      }

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // ── Sync canvas resolution to the video's native size ──────────────────
    useEffect(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      function syncSize() {
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      video.addEventListener('loadedmetadata', syncSize);
      if (video.readyState >= 1) syncSize();
      return () => video.removeEventListener('loadedmetadata', syncSize);
    }, [videoUrl]);

    // ── Draw overlays every frame ───────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
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
        const settings = blurredFaces[face.track_id];

        // ── Smoothing ──────────────────────────────────────────────────────
        // Lerp the smoothed position toward the raw detection.
        // Blurred faces use their stored smoothing; unblurred preview boxes
        // always use Low so they don't jitter either.
        const factor = SMOOTHING_FACTOR[settings?.smoothing ?? 'Low'];
        const [px, py, pw, ph] = smoothedPos.current[face.track_id] ?? [
          rawX,
          rawY,
          rawW,
          rawH,
        ];

        const sx = lerp(px, rawX, factor);
        const sy = lerp(py, rawY, factor);
        const sw = lerp(pw, rawW, factor);
        const sh = lerp(ph, rawH, factor);
        smoothedPos.current[face.track_id] = [sx, sy, sw, sh];

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
          drawDetectionBox(ctx, sx, sy, sw, sh, face.track_id);
        }
      }
    }, [currentFrame, detections, blurredFaces]);

    // ── Control handlers ───────────────────────────────────────────────────
    function togglePlay() {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) video.play();
      else video.pause();
    }

    function toggleMute() {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
      const video = videoRef.current;
      if (!video) return;
      const v = Number(e.target.value);
      video.volume = v;
      video.muted = v === 0;
    }

    function toggleFullscreen() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }

    return (
      <div ref={wrapperRef} className="relative inline-block w-full bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="block w-full"
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
          onClick={togglePlay}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />

        {/* ── Custom control bar ───────────────────────────────────────────── */}
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
          {/* Left: play/pause + volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="text-white/80 transition hover:text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <IconPause /> : <IconPlay />}
            </button>

            <div className="group flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white/80 transition hover:text-white"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <IconVolumeMute /> : <IconVolume />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-0 cursor-pointer overflow-hidden accent-white transition-all duration-200 group-hover:w-16"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Right: fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white/80 transition hover:text-white"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <IconCompress /> : <IconExpand />}
          </button>
        </div>
      </div>
    );
  },
);

export default VideoPlayer;

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconPlay() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <polygon points="5,3 17,10 5,17" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <rect x="4" y="3" width="4" height="14" rx="1" />
      <rect x="12" y="3" width="4" height="14" rx="1" />
    </svg>
  );
}

function IconVolume() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 7.5h3l4-3v11l-4-3H3z" />
      <path d="M13.5 6.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function IconVolumeMute() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 7.5h3l4-3v11l-4-3H3z" />
      <line x1="13" y1="7" x2="18" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="7" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />
    </svg>
  );
}

function IconCompress() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" />
    </svg>
  );
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawDetectionBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  trackId: string,
) {
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.strokeRect(x, y, w, h);
  ctx.fillText(`Face ${trackId}`, x + 4, y - 6 > 0 ? y - 6 : y + 16);
}

// Clip the canvas context to either a rectangle or an ellipse.
// All three blur types call this before drawing so the effect stays
// within the (padded, possibly elliptical) box boundary.
function clipToShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  shape: BlurShape,
) {
  ctx.beginPath();
  if (shape === 'Ellipse') {
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
  x: number,
  y: number,
  w: number,
  h: number,
  settings: BlurSettings,
) {
  switch (settings.type) {
    case 'Gaussian':
      drawGaussian(ctx, video, x, y, w, h, settings);
      break;
    case 'Pixelate':
      drawPixelate(ctx, video, x, y, w, h, settings);
      break;
    case 'Solid mask':
      drawSolid(ctx, x, y, w, h, settings);
      break;
  }
}

function drawGaussian(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
  { strength, shape }: BlurSettings,
) {
  // Map 0-100 % → 2-30 px blur radius.
  const blurPx = Math.round(2 + (strength / 100) * 28);
  // Draw a padded region from the video so the kernel has real edge pixels
  // to sample from — without this the blur darkens at the clip boundary.
  const overlap = blurPx * 2;

  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  clipToShape(ctx, x, y, w, h, shape);

  const sx = Math.max(0, x - overlap);
  const sy = Math.max(0, y - overlap);
  const sw = Math.min(video.videoWidth - sx, w + overlap * 2);
  const sh = Math.min(video.videoHeight - sy, h + overlap * 2);
  ctx.drawImage(video, sx, sy, sw, sh, sx, sy, sw, sh);

  ctx.restore();
}

function drawPixelate(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
  { strength, shape }: BlurSettings,
) {
  // Map 0-100 % → 4-32 px block size. Larger blocks = more pixelated.
  const blockSize = Math.max(4, Math.round(4 + (strength / 100) * 60));
  const pixW = Math.max(1, Math.round(w / blockSize));
  const pixH = Math.max(1, Math.round(h / blockSize));

  // Step 1 — downsample the face region to a few pixels
  const tmp = document.createElement('canvas');
  tmp.width = pixW;
  tmp.height = pixH;
  tmp.getContext('2d')!.drawImage(video, x, y, w, h, 0, 0, pixW, pixH);

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
  x: number,
  y: number,
  w: number,
  h: number,
  { color, strength, shape }: BlurSettings,
) {
  // Strength maps 0-100 % → opacity 0.4-1.0 so even at 0 there's a visible mark.
  const opacity = 0.4 + (strength / 100) * 0.6;
  const colorMap: Record<BlurColor, string> = {
    Neutral: `rgba(0,   0,   0,   ${opacity})`,
    Warm: `rgba(60,  20,  0,   ${opacity})`,
    Cool: `rgba(0,   20,  60,  ${opacity})`,
  };

  ctx.save();
  ctx.fillStyle = colorMap[color];

  if (shape === 'Ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }

  ctx.restore();
}
