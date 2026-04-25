import { useRef, useState } from 'react';
import type { JobMeta } from './../types';

const FACE_COLORS = [
  'bg-teal-400',
  'bg-orange-400',
  'bg-violet-400',
  'bg-sky-400',
  'bg-rose-400',
  'bg-lime-400',
];

interface FaceTimelineProps {
  faces: JobMeta['faces'];
  totalFrames?: number;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatTime(time: number): string {
  if (!Number.isFinite(time) || time <= 0) return '0:00';

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function FaceTimeline({
  faces = [],
  totalFrames,
  currentTime,
  duration,
  onSeek,
}: FaceTimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const lastSeekTime = useRef(0);

  const fallbackTotalFrames = Math.max(
    ...faces.map((face) => face.last_frame),
    1,
  );

  const safeTotalFrames = Math.max(totalFrames ?? fallbackTotalFrames, 1);

  const [dragTime, setDragTime] = useState<number | null>(null);

  const displayTime = dragTime ?? currentTime;
  const playheadPercent =
    duration > 0
      ? Math.max(0, Math.min(100, (displayTime / duration) * 100))
      : 0;

  function getTimeFromClientX(clientX: number) {
    const el = trackAreaRef.current;
    if (!el || duration <= 0) return null;

    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    return ratio * duration;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();

    const initialTime = getTimeFromClientX(e.clientX);
    if (initialTime === null) return;

    setDragTime(initialTime);
    onSeek(initialTime);

    const onPointerMove = (event: PointerEvent) => {
      const nextTime = getTimeFromClientX(event.clientX);
      if (nextTime === null) return;

      setDragTime(nextTime);

      const now = performance.now();
      if (now - lastSeekTime.current > 100) {
        onSeek(nextTime);
        lastSeekTime.current = now;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const finalTime = getTimeFromClientX(event.clientX);

      if (finalTime !== null) {
        onSeek(finalTime);
      }

      setDragTime(null);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  return (
    <section className="mt-5 rounded-[14px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
          Face timeline
        </p>

        <p className="font-mono text-xs text-white/30">
          {formatTime(currentTime)} /{' '}
          {duration > 0 ? formatTime(duration) : '—'}
        </p>
      </div>

      <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3">
        <div className="space-y-3">
          {faces.map((face, index) => (
            <div key={face.track_id} className="flex h-[18px] items-center">
              <p className="text-sm font-bold text-white/65">
                Person {String.fromCharCode(65 + index)}
              </p>
            </div>
          ))}
        </div>

        <div
          ref={trackAreaRef}
          onPointerDown={handlePointerDown}
          className="relative cursor-ew-resize select-none touch-none"
        >
          <div className="space-y-3">
            {faces.map((face, index) => {
              const start = Math.max(
                0,
                Math.min(100, (face.first_frame / safeTotalFrames) * 100),
              );

              const end = Math.max(
                0,
                Math.min(100, (face.last_frame / safeTotalFrames) * 100),
              );

              const width = Math.max(0.6, end - start);

              return (
                <div
                  key={face.track_id}
                  className="relative h-[18px] overflow-hidden rounded-full bg-white/[0.06]"
                >
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
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute -top-2 -bottom-2 z-30"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="h-full w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />

            <div className="absolute -top-6 left-0 -translate-x-1/2 rounded bg-[#0b0911] px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-300">
              {formatTime(displayTime)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[90px_minmax(0,1fr)] gap-x-3">
        <div />

        <div className="flex justify-between font-mono text-xs text-white/30">
          <span>0:00</span>
          <span>{duration > 0 ? formatTime(duration) : '—'}</span>
        </div>
      </div>
    </section>
  );
}
