import { useRef } from "react";
import { useVideoFrame } from "../hooks/useVideoFrame";

interface VideoPlayerProps {
  videoUrl: string;
  fps: number;
}
export default function VideoPlayer({ videoUrl, fps }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentFrame = useVideoFrame(videoRef, { fps });

  return (
    <div>
      <video ref={videoRef} controls src={videoUrl} />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
      <p>Frame: {currentFrame}</p>
    </div>
  );
}
