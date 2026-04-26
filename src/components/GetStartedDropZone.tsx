import { useRef, useState } from "react";

interface UploadDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  disabledLabel?: string;
}

const ACCEPTED_TYPES = ".mp4,.webm,.mov";
const DEFAULT_LABEL =
  "Drop a .mp4, .webm or .mov file here, or click to browse";

export default function UploadDropZone({
  onFileSelected,
  disabled = false,
  disabledLabel,
}: UploadDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (disabled) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  const label = disabled && disabledLabel ? disabledLabel : DEFAULT_LABEL;

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "relative max-w-[760px] mx-auto",
        "border border-dashed rounded-[16px] px-[36px] py-[56px]",
        "text-center overflow-hidden transition-all duration-200",
        "bg-white/50",
        disabled
          ? "pointer-events-none opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-white/70",
        dragOver ? "border-blue-400 bg-blue-950/30" : "border-black/20",
      ].join(" ")}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="absolute top-[12px] left-[12px] w-[14px] h-[14px] border-t border-l border-teal-500"></div>
      <div className="absolute top-[12px] right-[12px] w-[14px] h-[14px] border-t border-r border-teal-500"></div>
      <div className="absolute bottom-[12px] left-[12px] w-[14px] h-[14px] border-b border-l border-teal-500"></div>
      <div className="absolute bottom-[12px] right-[12px] w-[14px] h-[14px] border-b border-r border-teal-500"></div>

      <div className="w-[52px] h-[52px] rounded-[14px] bg-teal-500/10 flex items-center justify-center mx-auto mb-[16px]">
        <svg className="w-6 h-6 text-teal-500" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v13M7 10l5-7 5 7"
            stroke="#475569"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 18v1.5A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V18"
            stroke="#475569"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="font-space text-[16px] font-semibold text-black mb-[6px] tracking-[-0.02em]">
        Drag & drop your video
      </div>

      <div className="text-[13px] text-black/50 mb-[20px]">
        or click to browse
      </div>

      <span
        className="inline-block px-[20px] py-[8px] rounded-[7px] bg-[#475569] text-white text-[12px] font-space font-semibold tracking-[-0.01em] hover:-translate-y-[1px]
    hover:bg-teal-600 cursor-pointer"
      >
        Browse files
      </span>

      <p className="mt-4 text-sm text-gray-400">{label}</p>
    </div>
  );
}
