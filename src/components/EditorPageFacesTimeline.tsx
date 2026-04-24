// components/editor/FaceTimeline.tsx
import type { JobMeta } from "./../types";

const FACE_COLORS = [
  "bg-teal-400",
  "bg-orange-400",
  "bg-violet-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-lime-400",
];

interface FaceTimelineProps {
  faces: JobMeta["faces"];
  totalFrames?: number;
}

export default function FaceTimeline({
  faces = [],
  totalFrames,
}: FaceTimelineProps) {
  const fallbackTotalFrames = Math.max(
    ...faces.map((face) => face.last_frame),
    1,
  );

  const safeTotalFrames = Math.max(totalFrames ?? fallbackTotalFrames, 1);

  return (
    <section className="mt-5 rounded-[14px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
          Face timeline
        </p>

        <p className="font-mono text-xs text-white/25">0:00 → full video</p>
      </div>

      <div className="space-y-3">
        {faces.map((face, index) => {
          const start = Math.max(0, (face.first_frame / safeTotalFrames) * 100);

          const width = Math.max(
            1,
            ((face.last_frame - face.first_frame) / safeTotalFrames) * 100,
          );

          return (
            <div
              key={face.face_id}
              className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-3"
            >
              <p className="text-sm font-bold text-white/65">
                Person {String.fromCharCode(65 + index)}
              </p>

              <div className="relative h-[18px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`absolute top-0 h-full rounded-full ${
                    FACE_COLORS[index % FACE_COLORS.length]
                  }`}
                  style={{
                    left: `${start}%`,
                    width: `${width}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-[90px_minmax(0,1fr)] gap-3">
        <div />
        <div className="flex justify-between font-mono text-xs text-white/30">
          <span>0:00</span>
          <span>end</span>
        </div>
      </div>
    </section>
  );
}
