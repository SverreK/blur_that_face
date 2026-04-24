import { useState } from "react";
import type { DetectionData, JobMeta } from "../types";
import TopBar from "./EditorPageTopBar";
import LeftPanel from "./EditorPageLeftPanel";
import RightPanel from "./EditorPageRightPanel";
import FaceTimeline from "./EditorPageFacesTimeline";
import VideoPlayer from "./VideoPlayer";

interface EditorPageProps {
  job: JobMeta;
  detections: DetectionData | null;
}

export default function EditorPage({ job, detections }: EditorPageProps) {
  const faces = job.faces ?? [];
  const [selectedFaces, setSelectedFaces] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const blurredCount = 0;
  const totalFrames =
    job.total_frames ?? Math.max(...faces.map((f) => f.last_frame), 1);

  function toggleFace(faceId: number) {
    setSelectedFaces((prev) =>
      prev.includes(faceId)
        ? prev.filter((id) => id !== faceId)
        : [...prev, faceId],
    );
  }

  function selectAllFaces() {
    setSelectedFaces(faces.map((face) => face.face_id));
  }

  function clearSelected() {
    setSelectedFaces([]);
  }

  return (
    <main className="min-h-screen bg-[#0b0911] text-white pt-[60px]">
      <TopBar
        job={job}
        blurredCount={blurredCount}
        currentTime={currentTime}
        duration={duration}
      />

      <div className="grid h-[calc(100vh-95px)] grid-cols-[333px_minmax(0,1fr)_280px] overflow-hidden">
        <LeftPanel
          jobId={job.id}
          faces={faces}
          selectedFaces={selectedFaces}
          onToggleFace={toggleFace}
          onSelectAllFaces={selectAllFaces}
          onClearSelected={clearSelected}
        />

        <section className="sidebar-scroll overflow-y-auto bg-[#100e17] p-4">
          <div className="mx-auto w-full max-w-[850px]">
            <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-black">
              <VideoPlayer
                videoUrl={`/api/jobs/${job.id}/video`}
                fps={job.fps ?? 30}
                detections={detections}
                onTimeUpdate={setCurrentTime}
                onLoadedMetadata={setDuration}
              />

              <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[8px] bg-black/50 px-5 py-2 text-sm font-medium text-white/55 backdrop-blur-md">
                Click a face to blur it
              </div>
            </div>

            <FaceTimeline faces={faces} totalFrames={totalFrames} />
          </div>
        </section>

        <RightPanel job={job} blurredCount={blurredCount} />
      </div>
    </main>
  );
}
