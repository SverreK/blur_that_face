import type { JobMeta } from "./../types";

interface EditorTopBarProps {
  job: JobMeta;
  blurredCount: number;
  currentTime: number;
  duration: number;
}

export default function TopBar({
  job,
  blurredCount,
  currentTime,
  duration,
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

        <button
          disabled={blurredCount === 0}
          className="h-6 rounded-[8px] bg-white/10 px-5 text-[14px] font-bold text-white/35 disabled:cursor-not-allowed"
        >
          Export
        </button>
      </div>
    </header>
  );
}
