import type {
  BlurColor,
  BlurSettings,
  BlurShape,
  BlurSmoothing,
  BlurType,
} from './../types';

interface BlurTabProps {
  selectedCount: number;
  blurSettings: BlurSettings;
  onChangeBlurSettings: (s: BlurSettings) => void;
  onResetBlur: () => void;
}

export default function BlurTab({
  selectedCount,
  blurSettings,
  onChangeBlurSettings,
  onResetBlur,
}: BlurTabProps) {
  // Each helper spreads the current settings and overrides one key,
  // keeping the rest untouched.
  const set = <K extends keyof BlurSettings>(key: K, val: BlurSettings[K]) =>
    onChangeBlurSettings({ ...blurSettings, [key]: val });

  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/35">
          Blur settings
        </p>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-4">
        <div className="space-y-6 pb-4">
          <SettingGroup label="Blur type">
            <div className="grid grid-cols-1 gap-2">
              {(['Gaussian', 'Pixelate', 'Solid mask'] as BlurType[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    className={btn(blurSettings.type === t)}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
          </SettingGroup>

          <SettingGroup label="Strength">
            <SliderRow
              label="Amount"
              value={blurSettings.strength}
              onChange={(v) => set('strength', v)}
            />
          </SettingGroup>

          <SettingGroup label="Color">
            <div className="grid grid-cols-3 gap-2">
              {(['Neutral', 'Warm', 'Cool'] as BlurColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className={btn(blurSettings.color === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </SettingGroup>

          {/* BlazeFace detections often clip forehead and chin — padding corrects this. */}
          <SettingGroup label="Box padding">
            <SliderRow
              label="Expand"
              value={blurSettings.padding}
              max={50}
              unit="%"
              onChange={(v) => set('padding', v)}
            />
          </SettingGroup>

          <SettingGroup label="Box shape">
            <div className="grid grid-cols-2 gap-2">
              {(['Rectangle', 'Ellipse'] as BlurShape[]).map((s) => (
                <button
                  key={s}
                  onClick={() => set('shape', s)}
                  className={btn(blurSettings.shape === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </SettingGroup>

          {/*
            MediaPipe detection boxes shift slightly frame to frame even
            when the person isn't moving. Smoothing lerps each box toward
            the newly detected position at different rates, hiding that
            jitter. Higher = smoother movement but more lag on fast motion.
          */}
          <SettingGroup label="Smoothing">
            <div className="grid grid-cols-4 gap-1.5">
              {(['None', 'Low', 'Medium', 'High'] as BlurSmoothing[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => set('smoothing', s)}
                    className={btn(blurSettings.smoothing === s, true)}
                  >
                    {s}
                  </button>
                ),
              )}
            </div>
          </SettingGroup>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pb-4 pt-3">
        {selectedCount === 0 && (
          <p className="mb-3 text-[13px] text-white/30">No faces selected</p>
        )}
        <div className="flex justify-center">
          <button
            onClick={onResetBlur}
            className="h-[42px] w-[150px] rounded-[8px] border border-white/10 bg-transparent text-sm font-bold text-white/40 transition hover:bg-white/[0.05]"
          >
            Set default
          </button>
        </div>
      </div>
    </>
  );
}

// ── Small helper components ──────────────────────────────────────────────────

function btn(active: boolean, small = false) {
  const base = `rounded-[8px] border font-bold transition ${small ? 'h-[34px] text-xs' : 'h-[42px] text-sm'}`;
  return active
    ? `${base} border-teal-400 bg-teal-400/15 text-teal-300`
    : `${base} border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]`;
}

function SliderRow({
  label,
  value,
  max = 100,
  unit = '%',
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-white/40">{label}</span>
        <span className="font-mono text-sm text-white/70">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-400"
      />
    </div>
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
