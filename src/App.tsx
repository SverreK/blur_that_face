import Header from "./components/Header";
import HomePage from "./components/HomePage";
import ProcessingPage from "./components/ProcessingPage";
import EditorPage from "./components/EditorPage";
import JobStatusCard from "./components/JobStatusCard";
import { useJobPolling } from "./hooks/useJobPolling";
import { useEffect } from "react";

export default function App() {
  const {
    status,
    job,
    detections,
    isProcessing,
    progressPercentage,
    uploadFile,
    resetJob,
    exportVideo,
  } = useJobPolling();

  const isHome = !job;
  const isDetecting =
    job && ["uploading", "uploaded", "detecting"].includes(status);
  const isEditor = job && ["detected", "rendering", "done"].includes(status);

  useEffect(() => {
    if (status === "done" && job) {
      const link = document.createElement("a");
      link.href = `/api/jobs/${job.id}/output`;
      link.download = `blurred_${job.filename}`;
      link.click();
    }
  }, [status, job]);

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

      {isEditor && job && (
        <EditorPage
          job={job}
          detections={detections}
          onExport={exportVideo}
          status={status}
          progressPercentage={progressPercentage}
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
