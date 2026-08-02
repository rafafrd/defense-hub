import type { MemDefragerState } from '@hub/game-core';
import type { RendererProps } from '../types.js';

export function MemDefragerGrid({ snapshot, sendInput }: RendererProps) {
  const state = snapshot.state as MemDefragerState;
  const previewing = state.stage === 'preview';

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">
        {previewing
          ? 'Lendo setores — memorize a ordem'
          : `Repita a ordem · ${state.entered.length}/${state.sequenceLength} · tentativas ${state.attemptsLeft}`}
      </p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))` }}
      >
        {state.cells.map((cell) => {
          const lit = state.highlighted === cell.id;
          const confirmed = state.entered.includes(cell.id);
          return (
            <button
              key={cell.id}
              type="button"
              disabled={previewing}
              onClick={() => sendInput({ type: 'pointer', x: 0, y: 0, targetId: cell.id })}
              className={[
                'h-14 w-14 border text-sm transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor',
                lit ? 'border-phosphor bg-phosphor/25 text-phosphor' : 'border-line bg-panel text-muted',
                confirmed ? 'border-safe text-safe' : '',
                previewing ? 'cursor-not-allowed' : 'hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              {cell.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
