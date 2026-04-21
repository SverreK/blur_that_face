import type { JobStatus, JobMeta } from "../types";
import { STATUS_LABEL } from "../types";
import ProgressBar from "./Progressbar";

interface JobStatusCardProps {
  status: JobStatus;
  job: JobMeta;
  progressPercentage: number | null;
}

export default function JobStatusCard({
  status,
  job,
  progressPercentage,
}: JobStatusCardProps) {
  return (
    <div className="w-full max-w-lg bg-gray-900 rounded-xl p-6 space-y-3">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Status</span>
        <span
          className={[
            "text-sm font-medium",
            status === "error"
              ? "text-red-400"
              : status === "detected"
                ? "text-green-400"
                : "text-blue-400",
          ].join(" ")}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Filename row */}
      {job.filename && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">File</span>
          <span className="text-sm truncate max-w-[60%] text-right">
            {job.filename}
          </span>
        </div>
      )}

      {/* Progress bar during detection */}
      {status === "detecting" && <ProgressBar value={progressPercentage} />}

      {/* Face summary after detection */}
      {status === "detected" && job.faces && (
        <div className="pt-2 space-y-1">
          <span className="text-sm text-gray-400">
            Found {job.num_faces} face{job.num_faces !== 1 ? "s" : ""}
          </span>
          <ul className="text-xs text-gray-500 list-disc list-inside">
            {job.faces.map((f) => (
              <li key={f.face_id}>
                Face {f.face_id} — frames {f.first_frame}–{f.last_frame}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error message */}
      {status === "error" && (
        <p className="text-sm text-red-400">{job.error ?? "Unknown error"}</p>
      )}
    </div>
  );
}
