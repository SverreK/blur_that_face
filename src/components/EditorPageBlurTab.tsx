import { useState } from "react";

interface BlurTabProps {
  selectedCount: number;
  onClearSelected: () => void;
}

export default function BlurTab({
  selectedCount,
  onClearSelected,
}: BlurTabProps) {
  const [blurType, setBlurType] = useState("Gaussian");
  const [blurStrength, setBlurStrength] = useState(60);
  const [blurColor, setBlurColor] = useState("Neutral");

  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
          Blur settings
        </p>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-4">
        <div className="space-y-7 pb-4">
          <SettingGroup label="Blur type">
            <div className="grid grid-cols-1 gap-2">
              {["Gaussian", "Pixelate", "Solid mask"].map((type) => (
                <button
                  key={type}
                  onClick={() => setBlurType(type)}
                  className={`h-[42px] rounded-[8px] border text-sm font-bold transition ${
                    blurType === type
                      ? "border-teal-400 bg-teal-400/15 text-teal-300"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </SettingGroup>

          <SettingGroup label="Strength">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-white/40">Amount</span>
                <span className="font-mono text-sm text-white/70">
                  {blurStrength}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={blurStrength}
                onChange={(e) => setBlurStrength(Number(e.target.value))}
                className="w-full accent-teal-400"
              />
            </div>
          </SettingGroup>

          <SettingGroup label="Color">
            <div className="grid grid-cols-3 gap-2">
              {["Neutral", "Warm", "Cool"].map((color) => (
                <button
                  key={color}
                  onClick={() => setBlurColor(color)}
                  className={`h-[38px] rounded-[8px] border text-sm font-bold transition ${
                    blurColor === color
                      ? "border-teal-400 bg-teal-400/15 text-teal-300"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </SettingGroup>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClearSelected}
            className="h-[42px] rounded-[8px] border border-white/10 bg-transparent text-sm font-bold text-white/40 transition hover:bg-white/[0.05]"
          >
            Clear
          </button>

          <button
            disabled={selectedCount === 0}
            className="h-[42px] rounded-[8px] border border-teal-400/30 bg-teal-400/20 text-sm font-bold text-teal-300 transition hover:bg-teal-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/25"
          >
            Apply selected
          </button>
        </div>
      </div>
    </>
  );
}

function SettingGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white/25">
        {label}
      </p>
      {children}
    </div>
  );
}
