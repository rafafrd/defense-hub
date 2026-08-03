import type { StackPusherState } from '@hub/game-core';
import type { RendererProps } from '../types.js';

const formatTime = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const chebyshev = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

export function StackPusherBoard({ snapshot, sendInput, level }: RendererProps) {
  const state = snapshot.state as StackPusherState;

  const isPusher = (x: number, y: number) => x === state.pusherX && y === state.pusherY;
  const stackAt = (x: number, y: number) => state.stacks.find((s) => s.x === x && s.y === y);
  const skullAt = (x: number, y: number) => state.skulls.find((s) => s.x === x && s.y === y);
  const isDelete = (x: number, y: number) => x === state.deleteX && y === state.deleteY;
  const isOccupied = (x: number, y: number) => isPusher(x, y) || !!stackAt(x, y);
  const inPusherRadius = (x: number, y: number) => chebyshev(x, y, state.pusherX, state.pusherY) <= 1;

  // Nível 1 mantém o raio sempre visível — sem isso a regra fica invisível demais mesmo pra treino.
  const highlightPusherDrop = state.selection?.kind === 'pusher';
  const highlightStackRadius = state.selection?.kind === 'stack' || level <= 1;

  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) cells.push({ x, y });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className="text-threat">stacks restantes {state.stacksRemaining}</span>
        {state.timeLimitMs > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className={state.timeLeftMs < 10_000 ? 'text-threat' : ''}>tempo {formatTime(state.timeLeftMs)}</span>
          </>
        )}
        {state.moveLimit > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className={state.moves >= state.moveLimit - 5 ? 'text-threat' : ''}>
              movimentos {state.moves}/{state.moveLimit}
            </span>
          </>
        )}
      </p>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}
      >
        {cells.map(({ x, y }) => {
          const pusherHere = isPusher(x, y);
          const stack = stackAt(x, y);
          const skull = skullAt(x, y);
          const deleteHere = isDelete(x, y);
          const skullVisible = skull?.revealed ?? false;

          const selected =
            (pusherHere && state.selection?.kind === 'pusher') ||
            (!!stack && state.selection?.kind === 'stack' && state.selection.stackId === stack.id);

          const isValidDestination =
            !pusherHere &&
            !stack &&
            !isOccupied(x, y) &&
            ((highlightPusherDrop && !skullVisible) || (highlightStackRadius && inPusherRadius(x, y)));

          const classes = [
            'flex h-8 w-8 items-center justify-center border text-sm transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor sm:h-9 sm:w-9',
          ];

          if (pusherHere) classes.push('border-phosphor bg-phosphor/25 text-phosphor');
          else if (stack) classes.push('border-safe bg-safe/20 text-safe');
          else if (skullVisible) classes.push('border-threat bg-threat/20 text-threat');
          else if (deleteHere) classes.push('border-ink text-ink');
          else classes.push('border-line text-muted');

          if (selected) classes.push('ring-2 ring-phosphor');
          if (isValidDestination) classes.push('bg-phosphor/10 shadow-[inset_0_0_0_1px_rgba(240,168,49,0.5)]');

          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => sendInput({ type: 'pointer', x: 0, y: 0, targetId: `${x}-${y}` })}
              aria-label={`casa ${x},${y}`}
              className={classes.join(' ')}
            >
              {pusherHere ? '▲' : stack ? '■' : skullVisible ? '☠' : deleteHere ? '▽' : ''}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted">
        Clique no Pusher e depois numa casa livre para reposicioná-lo · clique num Stack no raio 3x3 e depois no destino.
      </p>
    </div>
  );
}
