import Loader from './ProcessingPageLoader';
import type { JobStatus } from '../types';

const PROCESSING_MESSAGES: Partial<Record<JobStatus, string>> = {
  uploading: 'Uploading your video…',
  uploaded: 'Preparing for detection…',
  detecting: 'Scanning frames for faces…',
};

interface ProcessingPageProps {
  status: JobStatus;
  progressPercentage: number | null;
  filename: string;
}

export default function ProcessingPage({
  status,
  progressPercentage,
  filename,
}: ProcessingPageProps) {
  const message = PROCESSING_MESSAGES[status] ?? 'Processing your video…';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-[80px]">
      <div className="w-full max-w-md text-center flex flex-col items-center gap-6">
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">{filename}</p>

          <h2
            key={status}
            className="text-2xl font-semibold text-zinc-900 transition-all duration-300"
          >
            {message}
          </h2>
        </div>

        <Loader />

        {status === 'detecting' && progressPercentage !== null && (
          <div className="mt-2">
            <span className="text-lg font-light text-[#0e0c15] tracking-tight">
              {progressPercentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
