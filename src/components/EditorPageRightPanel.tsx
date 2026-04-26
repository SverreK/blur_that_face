import type { JobMeta } from './../types';

interface RightPanelProps {
  job: JobMeta;
  blurredCount: number;
  duration?: number;
}

export default function RightPanel({
  job,
  blurredCount,
  duration,
}: RightPanelProps) {
  const faces = job.faces ?? [];

  const resolution =
    job.width && job.height ? `${job.width}×${job.height}` : 'Unknown';

  const frameRate = job.fps ? `${formatFps(job.fps)} fps` : 'Unknown';

  const videoDuration =
    duration && duration > 0 ? formatDuration(duration) : 'Unknown';

  return (
    <aside className="flex-1 sidebar-scroll overflow-y-auto border-l border-white/10 bg-[#0d0b14] p-4">
      <p className="mb-5 text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
        Video Properties
      </p>

      <div className="space-y-1">
        <Info label="Resolution" value={resolution} />
        <Info label="Frame rate" value={frameRate} />
        <Info label="Duration" value={videoDuration} />
        <Info label="Format" value={job.format ?? 'Unknown'} />
        <Info label="Codec" value={job.codec ?? 'Unknown'} />
        <Info label="Faces" value={`${faces.length} detected`} />
        <Info label="Blurred" value={`${blurredCount} faces`} />
      </div>
    </aside>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white/20">
        {label}
      </p>
      <p className="font-mono text-[15px] text-white/75">{value}</p>
    </div>
  );
}

function formatFps(fps: number) {
  return Number.isInteger(fps) ? String(fps) : fps.toFixed(2);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Unknown';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
