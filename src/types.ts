export type JobStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "detecting"
  | "detected"
  | "rendering"
  | "done"
  | "error";

export interface JobMeta {
  id: string;
  filename: string;
  status: JobStatus;
  error?: string;
  num_faces?: number;
  total_frames?: number;
  frame_progress?: { current: number; total: number } | null;
  faces?: {
    face_id: number;
    first_frame: number;
    last_frame: number;
    bbox_sample: number[];
  }[];
}

export const STATUS_LABEL: Record<JobStatus, string> = {
  idle: "Waiting for upload",
  uploading: "Uploading…",
  uploaded: "Uploaded — queuing detection…",
  detecting: "Detecting faces…",
  detected: "Detection complete",
  rendering: "Rendering blurred video…",
  done: "Done",
  error: "Error",
};
