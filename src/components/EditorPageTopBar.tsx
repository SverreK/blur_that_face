import type { JobMeta, BlurSettings, JobStatus } from "../types";

interface EditorTopBarProps {
  job: JobMeta;
  blurredCount: number;
  blurredFaces: Record<string, BlurSettings>;
  currentTime: number;
  duration: number;
  status: JobStatus;
  progressPercentage: number | null;
  onExport: () => void;
  onExportNew: () => void;
}

export default function TopBar({
  job,
  blurredCount,
  blurredFaces,
  currentTime,
  duration,
  status,
  progressPercentage,
  onExport,
  onExportNew,
}: EditorTopBarProps) {
  function formatTime(time: number) {
    if (!time || isNaN(time)) return "00:00";

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return (
    <header className="h-[35px] border-b border-white/10 bg-[#11101a] px-4 flex items-center justify-between">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white/70">
          {job.filename}
        </p>
      </div>

      <div className="font-mono text-[18px] font-bold text-white/70">
        {formatTime(currentTime)}{" "}
        <span className="text-white/25">/ {formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-white/45">
          <span className="text-teal-400">●</span> {blurredCount} blurred
        </span>

        {status === "rendering" && (
          <div className="flex items-center gap-2 w-40">
            <div className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-teal-400 transition-all duration-300"
                style={{ width: `${progressPercentage ?? 0}%` }}
              />
            </div>
            <span className="text-xs text-white/45 tabular-nums w-8 text-right">
              {Math.round(progressPercentage ?? 0)}%
            </span>
          </div>
        )}

        {status === "done" && (
          <>
            <a
              href={`/api/jobs/${job.id}/output`}
              download={`blurred_${job.filename}`}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Download again
            </a>
            <button onClick={onExportNew}>
              Export new
            </button>
          </>
        )}

        {(status === "detected" || status === "uploaded" || status === "detecting") && (
          <button
            onClick={onExport}
            disabled={Object.keys(blurredFaces).length === 0}
          >
            Export
          </button>
        )}
      </div>
    </header>
  );
}
