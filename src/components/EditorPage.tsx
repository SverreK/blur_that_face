import { useRef, useState, useEffect } from "react";
import type { VideoPlayerHandle } from "./EditorPageVideoPlayer";
import type { BlurSettings, DetectionData, JobMeta, JobStatus } from "../types";
import { DEFAULT_BLUR_SETTINGS } from "../types";
import TopBar from "./EditorPageTopBar";
import LeftPanel from "./EditorPageLeftPanel";
import RightPanel from "./EditorPageRightPanel";
import FaceTimeline from "./EditorPageFacesTimeline";
import VideoPlayer from "./EditorPageVideoPlayer";

interface EditorPageProps {
  job: JobMeta;
  detections: DetectionData | null;
  onExport: (jobId: string, blurredFaces: Record<string, BlurSettings>) => void;
  status: JobStatus;
  progressPercentage: number | null;
}

export default function EditorPage({
  job,
  detections,
  onExport,
  status,
  progressPercentage,
}: EditorPageProps) {
  const faces = job.faces ?? [];

  const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
  const [blurSettings, setBlurSettings] = useState<BlurSettings>(
    DEFAULT_BLUR_SETTINGS,
  );
  const [blurredFaces, setBlurredFaces] = useState<
    Record<string, BlurSettings>
  >({});

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Local override so "Export new" can show the Export button again after a
  // completed export, without requiring a backend status reset.
  const [exportNew, setExportNew] = useState(false);

  useEffect(() => {
    if (status === "done") setExportNew(false);
  }, [status]);

  const effectiveStatus: JobStatus = exportNew ? "detected" : status;
  const videoRef = useRef<VideoPlayerHandle>(null);

  const blurredCount = Object.keys(blurredFaces).length;
  const totalFrames =
    job.total_frames ?? Math.max(...faces.map((f) => f.last_frame), 1);

  function toggleFace(trackId: string) {
    if (!(trackId in blurredFaces)) {
      setBlurredFaces((prev) => ({ ...prev, [trackId]: { ...blurSettings } }));
    } else {
      setSelectedFaces((prev) =>
        prev.includes(trackId)
          ? prev.filter((id) => id !== trackId)
          : [...prev, trackId],
      );
    }
  }

  function handleSeek(time: number) {
    videoRef.current?.seekTo(time);
  }

  function selectAllFaces() {
    setSelectedFaces(
      faces.filter((f) => f.track_id in blurredFaces).map((f) => f.track_id),
    );
  }

  // Deselect all from editing; blur is unaffected
  function clearSelected() {
    setSelectedFaces([]);
  }

  function blurAllFaces() {
    setBlurredFaces((prev) => {
      const next = { ...prev };
      faces.forEach((f) => {
        if (!(f.track_id in next)) {
          next[f.track_id] = { ...blurSettings };
        }
      });
      return next;
    });
  }

  function resetAllFaces() {
    setBlurredFaces({});
    setSelectedFaces([]);
  }

  // When blur settings change, push the new values to selected faces.
  // If no faces are selected, apply to all blurred faces (global setting).
  // Fires only on blurSettings changes, not on selection changes.
  useEffect(() => {
    setBlurredFaces((prev) => {
      const ids = selectedFaces.length > 0 ? selectedFaces : Object.keys(prev);
      if (ids.length === 0) return prev;
      const next = { ...prev };
      ids.forEach((id) => {
        if (id in next) next[id] = { ...blurSettings };
      });
      return next;
    });
  }, [blurSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetBlurSettings() {
    setBlurSettings(DEFAULT_BLUR_SETTINGS);
  }

  function removeBlurFromFace(trackId: string) {
    setBlurredFaces((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
    setSelectedFaces((prev) => prev.filter((id) => id !== trackId));
  }

  return (
    <main className="min-h-screen bg-[#0b0911] text-white pt-[60px]">
      <TopBar
        job={job}
        blurredCount={Object.keys(blurredFaces).length}
        blurredFaces={blurredFaces}
        status={effectiveStatus}
        progressPercentage={progressPercentage}
        onExport={() => onExport(job.id, blurredFaces)}
        onExportNew={() => setExportNew(true)}
      />

      <div className="grid h-[calc(100vh-95px)] grid-cols-[333px_minmax(0,1fr)_280px] grid-rows-[calc(100vh-95px)] overflow-hidden">
        <LeftPanel
          jobId={job.id}
          faces={faces}
          selectedFaces={selectedFaces}
          blurredFaces={blurredFaces}
          blurSettings={blurSettings}
          onToggleFace={toggleFace}
          onSelectAllFaces={selectAllFaces}
          onClearSelected={clearSelected}
          onChangeBlurSettings={setBlurSettings}
          onResetBlur={resetBlurSettings}
          onRemoveBlur={removeBlurFromFace}
          onBlurAll={blurAllFaces}
          onResetAll={resetAllFaces}
        />

        <section className="sidebar-scroll overflow-y-auto bg-[#100e17] p-4">
          <div className="mx-auto w-full max-w-[850px]">
            <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-black">
              <VideoPlayer
                ref={videoRef}
                videoUrl={`/api/jobs/${job.id}/video`}
                fps={job.fps ?? 30}
                detections={detections}
                blurredFaces={blurredFaces}
                onTimeUpdate={setCurrentTime}
                onLoadedMetadata={setDuration}
              />
            </div>

            <FaceTimeline
              faces={faces}
              totalFrames={totalFrames}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />
          </div>
        </section>

        <RightPanel job={job} blurredCount={blurredCount} duration={duration} />
      </div>
    </main>
  );
}
