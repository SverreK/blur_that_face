import type { JobMeta, BlurSettings, JobStatus } from '../types';

interface EditorTopBarProps {
  job: JobMeta;
  blurredCount: number;
  blurredFaces: Record<string, BlurSettings>;
  status: JobStatus;
  progressPercentage: number | null;
  onExport: () => void;
  onExportNew: () => void;
}

export default function TopBar({
  job,
  blurredCount,
  blurredFaces,
  status,
  progressPercentage,
  onExport,
  onExportNew,
}: EditorTopBarProps) {
  return (
    <header className="h-8.75 border-b border-white/10 bg-[#11101a] px-4 flex items-center justify-between">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white/70">
          {job.filename}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-white/45">
          <span className="text-teal-400">●</span> {blurredCount} blurred
        </span>

        {status === 'rendering' && (
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

        {status === 'done' && (
          <>
            <a
              href={`/api/jobs/${job.id}/output`}
              download={`blurred_${job.filename}`}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Download again
            </a>
            <button onClick={onExportNew} className="font-bold bg-teal-600 text-sm text-white/80 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 px-4 py-0.8 border border-white/10 rounded cursor-pointer">
              Export new
            </button>
          </>
        )}

        {(status === 'detected' ||
          status === 'uploaded' ||
          status === 'detecting') && (
          <button
            className="font-bold bg-teal-600 text-sm text-white/80 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 px-4 py-0.8 border border-white/10 rounded cursor-pointer"
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
