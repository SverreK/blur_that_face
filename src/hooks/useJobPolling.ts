import { useEffect, useRef, useState } from "react";
import type { JobMeta, JobStatus, DetectionData } from "../types";

const POLL_INTERVAL_MS = 1500;

export function useJobPolling() {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [job, setJob] = useState<JobMeta | null>(null);
  const [detections, setDetections] = useState<DetectionData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(jobId: string) {
    stopPolling();

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);

        if (!res.ok) {
          throw new Error("Could not fetch job status");
        }

        const meta = (await res.json()) as JobMeta;
        setJob(meta);
        setStatus(meta.status);

        if (meta.status === "detected") {
          stopPolling();
          fetchDetections(jobId);
        } else if (["done", "error"].includes(meta.status)) {
          stopPolling();
        }
      } catch (error) {
        stopPolling();
        setStatus("error");
        setJob((prev) =>
          prev ? { ...prev, status: "error", error: "Polling failed" } : null,
        );
      }
    }, POLL_INTERVAL_MS);
  }

  async function fetchDetections(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/detections`);
      if (!res.ok) throw new Error("Failed to fetch detections");
      const data = (await res.json()) as DetectionData;
      setDetections(data);
    } catch (error) {
      setDetections(null);
      setJob((prev) =>
        prev
          ? { ...prev, status: "error", error: "Failed to load detections" }
          : null,
      );
      setStatus("error");
    }
  }

  async function uploadFile(file: File) {
    setStatus("uploading");
    setJob(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const { detail } = await res.json();
        setStatus("error");
        setJob({
          id: "",
          filename: file.name,
          status: "error",
          error: detail,
        });
        return;
      }

      const { job_id } = await res.json();
      setStatus("uploaded");
      startPolling(job_id);
    } catch (error) {
      setStatus("error");
      setJob({
        id: "",
        filename: file.name,
        status: "error",
        error: "upload failed",
      });
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const isProcessing = [
    "uploading",
    "uploaded",
    "detecting",
    "rendering",
  ].includes(status);

  const progressPercentage = job?.frame_progress
    ? Math.round((job.frame_progress.current / job.frame_progress.total) * 100)
    : null;

  return {
    status,
    job,
    detections,
    isProcessing,
    progressPercentage,
    uploadFile,
    startPolling,
    stopPolling,
  };
}
