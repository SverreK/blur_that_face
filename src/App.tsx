import { useEffect, useRef, useState } from "react";
import UploadDropZone from "./components/UploadDropZone";
import JobStatusCard from "./components/JobStatusCard";
import type { JobMeta, JobStatus } from "./types";
import { STATUS_LABEL } from "./types";

const POLL_INTERVAL_MS = 1500;

export default function App() {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [job, setJob] = useState<JobMeta | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  function startPolling(jobId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const meta = (await res.json()) as JobMeta;
      setJob(meta);
      setStatus(meta.status);
      if (["detected", "done", "error"].includes(meta.status)) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  async function uploadFile(file: File) {
    setStatus("uploading");
    setJob(null);

    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body });

    if (!res.ok) {
      const { detail } = await res.json();
      setStatus("error");
      setJob({ id: "", filename: file.name, status: "error", error: detail });
      return;
    }

    const { job_id } = await res.json();
    setStatus("uploaded");
    startPolling(job_id);
  }

  // "Derived" values that depends on state
  const isProcessing = [
    "uploading",
    "uploaded",
    "detecting",
    "rendering",
  ].includes(status);

  const progressPercentage = job?.frame_progress
    ? Math.round((job.frame_progress.current / job.frame_progress.total) * 100)
    : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-4xl font-bold tracking-tight">Blur That Face</h1>

      {/* Drop zone */}
      <UploadDropZone
        onFileSelected={uploadFile}
        disabled={isProcessing}
        disabledLabel={STATUS_LABEL[status]}
      />

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
