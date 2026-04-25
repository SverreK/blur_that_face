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

    let handle: number;

    function onFrame(
      _now: DOMHighResTimeStamp,
      metadata: VideoFrameCallbackMetadata,
    ) {
      setCurrentFrame(Math.floor(metadata.mediaTime * fps));
      handle = video!.requestVideoFrameCallback(onFrame);
    }

    // Start the callback loop
    handle = video.requestVideoFrameCallback(onFrame);

    // Still listen for seeks so the frame updates when paused and scrubbing
    function onSeek() {
      if (!video) return;
      setCurrentFrame(Math.floor(video.currentTime * fps));
    }
    video.addEventListener("seeked", onSeek);

    return () => {
      video.cancelVideoFrameCallback(handle);
      video.removeEventListener("seeked", onSeek);
    };
  }, [videoRef, fps]);

  return currentFrame;
}
