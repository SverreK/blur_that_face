import type { BlurSettings, JobMeta } from './../types';

const FACE_COLORS = [
  'bg-teal-400',
  'bg-orange-400',
  'bg-violet-400',
  'bg-sky-400',
  'bg-rose-400',
  'bg-lime-400',
];

interface FacesTabProps {
  jobId: string;
  faces: JobMeta['faces'];
  selectedFaces: string[];
  blurredFaces: Record<string, BlurSettings>;
  onToggleFace: (trackId: string) => void;
  onSelectAllFaces: () => void;
  onClearSelected: () => void;
  onRemoveBlur: (trackId: string) => void;
  onBlurAll: () => void;
  onResetAll: () => void;
}

export default function FacesTab({
  jobId,
  faces = [],
  selectedFaces,
  blurredFaces,
  onToggleFace,
  onSelectAllFaces,
  onClearSelected,
  onRemoveBlur,
  onBlurAll,
  onResetAll,
}: FacesTabProps) {
  const blurredCount = Object.keys(blurredFaces).length;

  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
              Faces
            </p>
            <span className="text-sm font-bold text-orange-400">
              {blurredCount}/{faces.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBlurAll}
              disabled={blurredCount === faces.length}
              className="text-[11px] font-medium text-white/30 transition hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Blur all
            </button>
            <span className="text-[11px] text-white/20">·</span>
            <button
              onClick={onResetAll}
              disabled={blurredCount === 0}
              className="text-[11px] font-medium text-white/30 transition hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset all
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4">
        <div className="flex flex-col gap-2 pb-4">
          {faces.map((face, index) => {
            const selected = selectedFaces.includes(face.track_id);
            const blurred = face.track_id in blurredFaces;

            return (
              <div
                key={face.track_id}
                onClick={() => onToggleFace(face.track_id)}
                className={`flex h-[64px] items-center justify-between rounded-[10px] border px-3 text-left transition ${
                  blurred && selected
                    ? 'border-teal-400/60 bg-teal-400/15'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnail — falls back to coloured placeholder */}
                  <img
                    src={`/api/jobs/${jobId}/faces/${face.track_id}/thumbnail`}
                    alt={`Person ${String.fromCharCode(65 + index)}`}
                    className={`h-[43px] w-[43px] shrink-0 rounded-[7px] object-cover ${
                      FACE_COLORS[index % FACE_COLORS.length]
                    }`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.removeAttribute(
                        'hidden',
                      );
                    }}
                  />
                  <div
                    hidden
                    className={`flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[7px] ${
                      FACE_COLORS[index % FACE_COLORS.length]
                    } text-black/35`}
                  >
                    👤
                  </div>

                  <div>
                    <p className="text-[16px] font-bold leading-tight text-white/85">
                      Person {String.fromCharCode(65 + index)}
                    </p>
                    <p
                      className={`mt-1 text-[14px] ${
                        blurred && selected
                          ? 'text-teal-300'
                          : blurred
                            ? 'text-orange-300'
                            : 'text-white/35'
                      }`}
                    >
                      {blurred
                        ? `blur · ${blurredFaces[face.track_id].type}`
                        : 'visible'}
                    </p>
                  </div>
                </div>
                <div>
                  {blurred && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBlur(face.track_id);
                      }}
                      className="text-[11px] font-medium text-white/30 hover:text-white/60 transition cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Right indicator dot */}
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    blurred && selected
                      ? 'bg-teal-400'
                      : blurred
                        ? 'bg-orange-400'
                        : 'bg-white/15'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pb-4 pt-3">
        <p className="mb-3 text-[15px] text-white/35">
          {Object.keys(blurredFaces).length} of {faces.length} faces blurred
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const blurredIds = Object.keys(blurredFaces);
            const allSelected =
              blurredIds.length > 0 &&
              blurredIds.every((id) => selectedFaces.includes(id));
            const noBlurred = blurredIds.length === 0;
            return (
              <button
                onClick={allSelected ? onClearSelected : onSelectAllFaces}
                disabled={noBlurred}
                className="h-10.5 rounded-lg border border-white/10 bg-white/6 text-sm font-bold text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            );
          })()}
          <button
            onClick={onClearSelected}
            className="h-[42px] rounded-[8px] border border-white/10 bg-transparent text-sm font-bold text-white/35 transition hover:bg-white/[0.05]"
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
}
