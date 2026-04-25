import type {
  BlurColor,
  BlurSettings,
  BlurShape,
  BlurSmoothing,
  BlurType,
} from "./../types";

interface BlurTabProps {
  selectedCount: number;
  blurSettings: BlurSettings;
  onChangeBlurSettings: (s: BlurSettings) => void;
  onApplyBlur: () => void;
  onResetBlur: () => void;
}

export default function BlurTab({
  selectedCount,
  blurSettings,
  onChangeBlurSettings,
  onApplyBlur,
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
          {/* ── Blur type ───────────────────────────────────────────── */}
          <SettingGroup label="Blur type">
            <div className="grid grid-cols-1 gap-2">
              {(["Gaussian", "Pixelate", "Solid mask"] as BlurType[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => set("type", t)}
                    className={btn(blurSettings.type === t)}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
          </SettingGroup>

          {/* ── Strength ────────────────────────────────────────────── */}
          <SettingGroup label="Strength">
            <SliderRow
              label="Amount"
              value={blurSettings.strength}
              onChange={(v) => set("strength", v)}
            />
          </SettingGroup>

          {/* ── Color (Solid mask tint) ──────────────────────────────── */}
          <SettingGroup label="Color">
            <div className="grid grid-cols-3 gap-2">
              {(["Neutral", "Warm", "Cool"] as BlurColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => set("color", c)}
                  className={btn(blurSettings.color === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </SettingGroup>

          {/* ── Box padding ─────────────────────────────────────────── */}
          {/*
            BlazeFace boxes are tight — they often clip foreheads and chins.
            Padding expands the box by this % of its own width/height on each
            side, so the effect fully covers the face even when the detection
            is slightly conservative.
          */}
          <SettingGroup label="Box padding">
            <SliderRow
              label="Expand"
              value={blurSettings.padding}
              max={50}
              unit="%"
              onChange={(v) => set("padding", v)}
            />
          </SettingGroup>

          {/* ── Box shape ───────────────────────────────────────────── */}
          {/*
            Ellipses look more natural because faces are oval, not square.
            The blur / mask is clipped to the chosen shape before being
            drawn, so the transition to the unblurred region follows that
            outline.
          */}
          <SettingGroup label="Box shape">
            <div className="grid grid-cols-2 gap-2">
              {(["Rectangle", "Ellipse"] as BlurShape[]).map((s) => (
                <button
                  key={s}
                  onClick={() => set("shape", s)}
                  className={btn(blurSettings.shape === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </SettingGroup>

          {/* ── Smoothing ───────────────────────────────────────────── */}
          {/*
            MediaPipe detection boxes shift slightly frame to frame even
            when the person isn't moving. Smoothing lerps each box toward
            the newly detected position at different rates, hiding that
            jitter. Higher = smoother movement but more lag on fast motion.
          */}
          <SettingGroup label="Smoothing">
            <div className="grid grid-cols-4 gap-1.5">
              {(["None", "Low", "Medium", "High"] as BlurSmoothing[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => set("smoothing", s)}
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
          <p className="mb-3 text-[13px] text-white/30">
            Select faces first to apply
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onResetBlur}
            className="h-[42px] rounded-[8px] border border-white/10 bg-transparent text-sm font-bold text-white/40 transition hover:bg-white/[0.05]"
          >
            Reset
          </button>
          <button
            onClick={onApplyBlur}
            disabled={selectedCount === 0}
            className="h-[42px] rounded-[8px] border border-teal-400/30 bg-teal-400/20 text-sm font-bold text-teal-300 transition hover:bg-teal-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/25"
          >
            Apply ({selectedCount})
          </button>
        </div>
      </div>
    </>
  );
}

// ── Small helper components ──────────────────────────────────────────────────

function btn(active: boolean, small = false) {
  const base = `rounded-[8px] border font-bold transition ${small ? "h-[34px] text-xs" : "h-[42px] text-sm"}`;
  return active
    ? `${base} border-teal-400 bg-teal-400/15 text-teal-300`
    : `${base} border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06]`;
}

function SliderRow({
  label,
  value,
  max = 100,
  unit = "%",
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
