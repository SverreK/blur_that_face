export type JobStatus =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'detecting'
  | 'detected'
  | 'rendering'
  | 'done'
  | 'error';

export interface JobMeta {
  id: string;
  filename: string;
  status: JobStatus;
  error?: string;
  num_faces?: number;
  fps?: number;
  width?: number;
  height?: number;
  total_frames?: number;
  format?: string;
  codec?: string;
  frame_progress?: { current: number; total: number } | null;
  faces?: {
    track_id: string;
    first_frame: number;
    last_frame: number;
    bbox_sample: number[];
  }[];
}
export const STATUS_LABEL: Record<JobStatus, string> = {
  idle: 'Waiting for upload',
  uploading: 'Uploading…',
  uploaded: 'Uploaded — queuing detection…',
  detecting: 'Detecting faces…',
  detected: 'Detection complete',
  rendering: 'Rendering blurred video…',
  done: 'Done',
  error: 'Error',
};

export type BlurType = 'Gaussian' | 'Pixelate' | 'Solid mask';
export type BlurColor = 'Neutral' | 'Warm' | 'Cool';
export type BlurShape = 'Rectangle' | 'Ellipse';
export type BlurSmoothing = 'None' | 'Low' | 'Medium' | 'High';

export interface BlurSettings {
  type: BlurType;
  strength: number; // 0-100 %
  color: BlurColor;
  padding: number; // 0-50 % of bbox dimension added on each side
  shape: BlurShape;
  smoothing: BlurSmoothing;
}

export const DEFAULT_BLUR_SETTINGS: BlurSettings = {
  type: 'Gaussian',
  strength: 80,
  color: 'Neutral',
  padding: 15,
  shape: 'Rectangle',
  smoothing: 'Low',
};

export interface FaceDetection {
  track_id: string;
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

export type InfoBoxProps = {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
};
