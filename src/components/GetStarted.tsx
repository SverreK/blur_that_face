import UploadDropZone from "./UploadDropZone";
import { STATUS_LABEL } from "../types";
import type { JobStatus } from "../types";

interface GetStartedProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  status: JobStatus;
}

export default function GetStarted({
  onFileSelected,
  isProcessing,
  status,
}: GetStartedProps) {
  return (
    <section
      id="get-started"
      className="min-h-screen bg-[rgb(237,236,234)] border-t border-[rgb(237,236,234)] py-[80px] px-[48px] pb-[96px]"
    >
      <div className="max-w-[760px] mx-auto">
        <h2 className="mb-[8px] font-space font-bold text-black text-[clamp(24px,3.5vw,36px)] tracking-tight">
          Drop your video here to get started!
        </h2>
        <p className="text-[14px] text-black/50 mb-[36px] font-light">
          MP4, MOV or AVI · up to 4K · processed entirely on your device
        </p>

        <UploadDropZone
          onFileSelected={onFileSelected}
          disabled={isProcessing}
          disabledLabel={STATUS_LABEL[status]}
        />
      </div>
    </section>
  );
}
