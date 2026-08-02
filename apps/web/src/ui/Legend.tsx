import type { MinigameEntry } from '@hub/game-core';

interface LegendProps {
  entry: MinigameEntry;
}

/** Legenda persistente ao lado da área de jogo — só nos níveis 1 e 2. */
export function Legend({ entry }: LegendProps) {
  return (
    <aside className="w-full shrink-0 border border-line bg-panel p-3 text-xs lg:w-48">
      <h2 className="text-[10px] uppercase tracking-[0.25em] text-phosphor">Legenda</h2>
      <ul className="mt-2 space-y-1.5">
        {entry.legend.map((item) => (
          <li key={item.symbol} className="flex items-center gap-2 text-muted">
            <span className="w-6 shrink-0 text-center font-display text-ink">{item.symbol}</span>
            <span>{item.meaning}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
