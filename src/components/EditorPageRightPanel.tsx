import type { JobMeta } from "./../types";

interface RightPanelProps {
  job: JobMeta;
  blurredCount: number;
}

export default function RightPanel({ job, blurredCount }: RightPanelProps) {
  const faces = job.faces ?? [];

  return (
    <aside className="sidebar-scroll overflow-y-auto border-l border-white/10 bg-[#0d0b14] p-4">
      <p className="mb-5 text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
        Video Properties
      </p>

      <div className="space-y-1">
        <Info label="Resolution" value="1920×1080" />
        <Info label="Frame rate" value={`${job.fps ?? 30} fps`} />
        <Info label="Duration" value="2:34" />
        <Info label="Format" value="MP4 / H.264" />
        <Info label="Faces" value={`${faces.length} detected`} />
        <Info label="Blurred" value={`${blurredCount} faces`} />
      </div>

      <div className="mt-3 border-t border-white/10 pt-5">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white/25">
          Face status
        </p>

        <div className="space-y-2">
          {faces.map((face, index) => (
            <div
              key={face.track_id}
              className="flex items-center justify-between text-sm text-white/35"
            >
              <span>• Person {String.fromCharCode(65 + index)}</span>
              <span>–</span>
            </div>
          ))}
        </div>
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
