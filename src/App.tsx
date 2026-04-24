import Header from "./components/Header";
import HomePage from "./components/HomePage";
import ProcessingPage from "./components/ProcessingPage";
import VideoPlayer from "./components/VideoPlayer";
import JobStatusCard from "./components/JobStatusCard";
import { useJobPolling } from "./hooks/useJobPolling";

export default function App() {
  const {
    status,
    job,
    detections,
    isProcessing,
    progressPercentage,
    uploadFile,
    resetJob,
  } = useJobPolling();

  const isHome = !job;
  const isDetecting =
    job && ["uploading", "uploaded", "detecting"].includes(status);
  const isEditor = job && ["detected", "done"].includes(status);

  return (
    <>
      <Header mode={status === "idle" ? "landing" : "app"} onReset={resetJob} />

      {isHome && (
        <HomePage
          onFileSelected={uploadFile}
          isProcessing={isProcessing}
          status={status}
        />
      )}

      {isDetecting && (
        <ProcessingPage
          status={status}
          progressPercentage={progressPercentage}
          filename={job.filename}
        />
      )}

      {isEditor && (
        <VideoPlayer
          videoUrl={`/api/jobs/${job.id}/video`}
          fps={job.fps ?? 30}
          detections={detections}
        />
      )}

      {status === "error" && job && (
        <JobStatusCard
          status={status}
          job={job}
          progressPercentage={progressPercentage}
        />
      )}
    </>
  );
}
