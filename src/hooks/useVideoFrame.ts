import { useEffect, useState } from "react";
import type { RefObject } from "react";

interface UseVideoFrameOptions {
  fps: number;
}

export function useVideoFrame(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseVideoFrameOptions,
) {
  const { fps } = options;
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function updateFrame() {
      if (!video) return;
      setCurrentFrame(Math.floor(video.currentTime * fps));
    }

    video.addEventListener("timeupdate", updateFrame);
    video.addEventListener("seeked", updateFrame);
    video.addEventListener("loadedmetadata", updateFrame);

    return () => {
      video.removeEventListener("timeupdate", updateFrame);
      video.removeEventListener("seeked", updateFrame);
      video.removeEventListener("loadedmetadata", updateFrame);
    };
  }, [videoRef, fps]);

  return currentFrame;
}
