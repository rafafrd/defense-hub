import type { MemDefragerState } from '@hub/game-core';
import type { RendererProps } from '../types.js';

export function MemDefragerGrid({ snapshot, sendInput, level }: RendererProps) {
  const state = snapshot.state as MemDefragerState;
  const showing = state.stage === 'showing';
  const canReplay = !showing && state.replaysLeft > 0;
  const showNumbers = level <= 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">
        rodada {state.round} de {state.totalRounds} · replays {state.replaysLeft} · tentativas {state.attemptsLeft}
      </p>

      <button
        type="button"
        disabled={showing || !canReplay}
        onClick={() => sendInput({ type: 'pointer', x: 0, y: 0, targetId: 'central' })}
        className={[
          'flex h-20 w-40 items-center justify-center border font-display text-2xl tracking-[0.3em] transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor',
          showing ? 'border-phosphor bg-phosphor/15 text-phosphor' : 'border-line bg-panel text-ink',
          canReplay ? 'cursor-pointer hover:border-ink' : 'cursor-not-allowed opacity-60',
        ].join(' ')}
      >
        {showing ? (state.centralDisplay ?? '') : 'REPRISAR'}
      </button>

      <div
        className={['grid gap-2', showing ? 'pointer-events-none opacity-40' : ''].join(' ')}
        style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}
      >
        {state.cells.map((cell) => {
          const enteredIndex = state.entered.indexOf(cell.id);
          const confirmed = enteredIndex !== -1;
          return (
            <button
              key={cell.id}
              type="button"
              disabled={showing}
              onClick={() => sendInput({ type: 'pointer', x: 0, y: 0, targetId: cell.id })}
              className={[
                'relative h-14 w-14 border text-sm transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor',
                confirmed ? 'border-safe text-safe' : 'border-line bg-panel text-muted',
                showing ? 'cursor-not-allowed' : 'hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              {cell.label}
              {showNumbers && confirmed && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-safe text-[9px] text-void">
                  {enteredIndex + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
