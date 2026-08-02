import type { MinigameEntry } from '@hub/game-core';

interface BriefingPanelProps {
  entry: MinigameEntry;
  /** 'compact' cabe no ArmingOverlay; 'full' é o card expandido do menu. */
  variant?: 'full' | 'compact';
}

/**
 * Única fonte visual do onboarding: objetivo, passos, condições de derrota e
 * legenda, todos lidos do registry — nenhum minigame precisa de texto próprio.
 */
export function BriefingPanel({ entry, variant = 'full' }: BriefingPanelProps) {
  if (variant === 'compact') {
    return (
      <div className="w-full text-left text-xs text-muted">
        <p className="text-ink">{entry.objective}</p>
        <ol className="mt-2 space-y-1">
          {entry.howTo.slice(0, 3).map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="text-phosphor">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left text-sm">
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.25em] text-phosphor">Objetivo</h3>
        <p className="mt-1 text-ink">{entry.objective}</p>
      </div>
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.25em] text-phosphor">Como jogar</h3>
        <ol className="mt-1 space-y-1 text-muted">
          {entry.howTo.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="text-ink">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.25em] text-threat">Você perde se</h3>
        <ul className="mt-1 space-y-1 text-muted">
          {entry.failsWhen.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="text-threat">×</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.25em] text-safe">Legenda</h3>
        <ul className="mt-1 grid grid-cols-1 gap-1 text-muted sm:grid-cols-2">
          {entry.legend.map((item) => (
            <li key={item.symbol} className="flex items-center gap-2">
              <span className="font-display text-ink">{item.symbol}</span>
              <span>{item.meaning}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
