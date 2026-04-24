import type { JobMeta } from "./../types";

const FACE_COLORS = [
  "bg-teal-400",
  "bg-orange-400",
  "bg-violet-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-lime-400",
];

interface FacesTabProps {
  jobId: string;
  faces: JobMeta["faces"];
  selectedFaces: number[];
  onToggleFace: (faceId: number) => void;
  onSelectAllFaces: () => void;
  onClearSelected: () => void;
}

export default function FacesTab({
  jobId,
  faces = [],
  selectedFaces,
  onToggleFace,
  onSelectAllFaces,
  onClearSelected,
}: FacesTabProps) {
  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
            Faces
          </p>

          <span className="text-sm font-bold text-teal-400">
            {selectedFaces.length}/{faces.length}
          </span>
        </div>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-4">
        <div className="flex flex-col gap-2 pb-4">
          {faces.map((face, index) => {
            const selected = selectedFaces.includes(face.face_id);

            return (
              <button
                key={face.face_id}
                onClick={() => onToggleFace(face.face_id)}
                className={`flex h-[64px] items-center justify-between rounded-[10px] border px-3 text-left transition ${
                  selected
                    ? "border-teal-400/60 bg-teal-400/15"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`/api/jobs/${jobId}/faces/${face.face_id}/thumbnail`}
                    alt={`Person ${String.fromCharCode(65 + index)}`}
                    className={`h-[43px] w-[43px] rounded-[7px] object-cover ${
                      FACE_COLORS[index % FACE_COLORS.length]
                    }`}
                    onError={(e) => {
                      // Fall back to a coloured placeholder if the crop fails
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.removeAttribute("hidden");
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
                        selected ? "text-teal-300" : "text-white/35"
                      }`}
                    >
                      {selected ? "selected" : "visible"}
                    </p>
                  </div>
                </div>

                <span
                  className={`h-2 w-2 rounded-full ${
                    selected ? "bg-teal-300" : "bg-white/15"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pb-4 pt-3">
        <p className="mb-3 text-[15px] text-white/35">
          {selectedFaces.length} of {faces.length} faces selected
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSelectAllFaces}
            className="h-[42px] rounded-[8px] border border-white/10 bg-white/[0.06] text-sm font-bold text-white/75 transition hover:bg-white/[0.1]"
          >
            Select all
          </button>

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
