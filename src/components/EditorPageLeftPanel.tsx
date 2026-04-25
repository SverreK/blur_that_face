import { useState } from "react";
import type { BlurSettings, JobMeta } from "./../types";
import FacesTab from "./EditorPageFacesTab";
import BlurTab from "./EditorPageBlurTab";

interface LeftPanelProps {
  jobId: string;
  faces: JobMeta["faces"];
  selectedFaces: string[];
  blurredFaces: Record<string, BlurSettings>;
  blurSettings: BlurSettings;
  onToggleFace: (trackId: string) => void;
  onSelectAllFaces: () => void;
  onClearSelected: () => void;
  onChangeBlurSettings: (s: BlurSettings) => void;
  onResetBlur: () => void;
}

export default function LeftPanel({
  jobId,
  faces = [],
  selectedFaces,
  blurredFaces,
  blurSettings,
  onToggleFace,
  onSelectAllFaces,
  onClearSelected,
  onChangeBlurSettings,
  onResetBlur,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<"faces" | "blur">("faces");

  return (
    <aside className="flex flex-col overflow-hidden border-r border-white/10 bg-[#0d0b14]">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="mb-4 flex rounded-[10px] border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setActiveTab("faces")}
            className={`h-9 flex-1 rounded-[7px] text-[13px] font-bold transition ${
              activeTab === "faces"
                ? "bg-teal-400 text-[#06110f]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Select faces
          </button>

          <button
            onClick={() => setActiveTab("blur")}
            className={`h-9 flex-1 rounded-[7px] text-[13px] font-bold transition ${
              activeTab === "blur"
                ? "bg-teal-400 text-[#06110f]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === "faces" ? (
        <FacesTab
          jobId={jobId}
          faces={faces}
          selectedFaces={selectedFaces}
          blurredFaces={blurredFaces}
          onToggleFace={onToggleFace}
          onSelectAllFaces={onSelectAllFaces}
          onClearSelected={onClearSelected}
        />
      ) : (
        <BlurTab
          selectedCount={selectedFaces.length}
          blurSettings={blurSettings}
          onChangeBlurSettings={onChangeBlurSettings}
          onResetBlur={onResetBlur}
        />
      )}
    </aside>
  );
}
