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
        "w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center transition-colors",
        disabled
          ? "pointer-events-none opacity-50 cursor-not-allowed"
          : "cursor-pointer",
        dragOver
          ? "border-blue-400 bg-blue-950/30"
          : "border-gray-700 hover:border-gray-500",
      ].join(" ")}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="text-lg text-gray-400">{label}</p>
    </div>
  );
}
