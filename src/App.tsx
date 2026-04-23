import HomePage from "./components/HomePage";
import JobStatusCard from "./components/JobStatusCard";
import { useJobPolling } from "./hooks/useJobPolling";
import VideoPlayer from "./components/VideoPlayer";

// App.tsx
export default function App() {
  const {
    status,
    job,
    detections,
    isProcessing,
    progressPercentage,
    uploadFile,
  } = useJobPolling();

  return (
    <>
      {!job ? (
        <HomePage
          onFileSelected={uploadFile}
          isProcessing={isProcessing}
          status={status}
        />
      ) : (
        <>
          <VideoPlayer
            videoUrl={`/api/jobs/${job.id}/video`}
            fps={job.fps ?? 30}
            detections={detections}
          />
          {status !== "idle" && (
            <JobStatusCard
              status={status}
              job={job}
              progressPercentage={progressPercentage}
            />
          )}
        </>
      )}
    </>
  );
}
