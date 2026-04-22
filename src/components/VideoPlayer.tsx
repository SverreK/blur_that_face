import { useRef, useEffect } from "react";
import { useVideoFrame } from "../hooks/useVideoFrame";
import type { DetectionData } from "../types";

interface VideoPlayerProps {
  videoUrl: string;
  fps: number;
  detections: DetectionData | null;
}

export default function VideoPlayer({
  videoUrl,
  fps,
  detections,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFrame = useVideoFrame(videoRef, { fps });

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function syncSize() {
      if (!video || !canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    video.addEventListener("loadedmetadata", syncSize);
    // In case the video is already loaded (e.g. src didn't change)
    if (video.readyState >= 1) syncSize();

    return () => video.removeEventListener("loadedmetadata", syncSize);
  }, [videoUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections) return;

    const frameData = detections.frames[currentFrame];
    if (!frameData?.faces.length) return;

    ctx.strokeStyle = "#facc15"; // Tailwind yellow-400
    ctx.lineWidth = 3;
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#facc15";

    for (const face of frameData.faces) {
      const [x, y, w, h] = face.bbox;
      ctx.strokeRect(x, y, w, h);
      // Label each box with its stable face_id so the user can identify
      // which ID to select for blurring.
      ctx.fillText(`Face ${face.face_id}`, x + 4, y - 6 > 0 ? y - 6 : y + 16);
    }
  }, [currentFrame, detections]);

  return (
    <div className="relative inline-block">
      <video
        ref={videoRef}
        controls
        src={videoUrl}
        className="block max-w-full"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
