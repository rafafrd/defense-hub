interface MeterProps {
  label: string;
  /** 0..1 */
  value: number;
  tone: 'safe' | 'threat' | 'phosphor';
}

const TONES = {
  safe: 'bg-safe',
  threat: 'bg-threat',
  phosphor: 'bg-phosphor',
} as const;

export function Meter({ label, value, tone }: MeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] text-muted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div
        className="mt-1 h-2 w-full border border-line bg-void"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${TONES[tone]} transition-[width] duration-100`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
