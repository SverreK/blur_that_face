import { useState } from "react";
import UploadDropZone from "./components/UploadDropZone";
import JobStatusCard from "./components/JobStatusCard";
import { STATUS_LABEL } from "./types";
import { useJobPolling } from "./hooks/useJobPolling";
import VideoPlayer from "./components/VideoPlayer";

export default function App() {
  const {
    status,
    job,
    detections,
    isProcessing,
    progressPercentage,
    uploadFile,
  } = useJobPolling();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-4xl font-bold tracking-tight">Blur That Face</h1>

      {/* Drop zone */}
      {!job ? (
        <UploadDropZone
          onFileSelected={uploadFile}
          disabled={isProcessing}
          disabledLabel={STATUS_LABEL[status]}
        />
      ) : (
        <VideoPlayer
          videoUrl={`/api/jobs/${job.id}/video`}
          fps={job.fps ?? 30}
          detections={detections}
        />
      )}

      {/* Status card */}
      {status !== "idle" && job && (
        <JobStatusCard
          status={status}
          job={job}
          progressPercentage={progressPercentage}
        />
      )}
    </div>
  );
}
