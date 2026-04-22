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
  fps?: number;
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

export interface FaceDetection {
  face_id: number;
  bbox: number[]; // [x, y, width, height]
  confidence: number;
}

export interface FrameDetection {
  frame: number;
  faces: FaceDetection[];
}

export interface DetectionData {
  frames: FrameDetection[];
}
