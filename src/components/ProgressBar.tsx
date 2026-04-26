interface ProgressBarProps {
  value: number | null;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  showLabel = true,
}: ProgressBarProps) {
  return (
    <div className="space-y-1">
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: value !== null ? `${value}%` : '100%' }}
        />
      </div>
      {showLabel && value !== null && (
        <p className="text-xs text-gray-500 text-right">{value}%</p>
      )}
    </div>
  );
}
