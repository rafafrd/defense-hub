import type { HexNode, NodeHexerState } from '@hub/game-core';
import type { RendererProps } from '../types.js';

const nodeStyle = (node: HexNode, state: NodeHexerState): string => {
  if (node.id === state.lastInvalidId) return 'border-threat bg-threat/25 text-threat animate-shake';
  if (node.id === state.startId) return 'border-phosphor bg-phosphor/20 text-phosphor';
  if (state.path.includes(node.id)) return 'border-safe bg-safe/20 text-safe';
  if (node.isTarget) return 'border-threat text-threat';
  return node.kind === 'alpha' ? 'border-line text-ink' : 'border-line text-muted';
};

export function NodeHexerBoard({ snapshot, sendInput }: RendererProps) {
  const state = snapshot.state as NodeHexerState;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">
        Alterne Alfa e Beta · alvos restantes {state.targetsRemaining}
      </p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${state.width}, minmax(0, 1fr))` }}
      >
        {state.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => sendInput({ type: 'pointer', x: node.x, y: node.y, targetId: node.id })}
            aria-label={`nó ${node.kind} ${node.x},${node.y}${node.isTarget ? ' alvo' : ''}`}
            className={[
              'flex h-12 w-12 items-center justify-center border bg-panel text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor',
              node.kind === 'alpha' ? 'rounded-none' : 'rounded-full',
              nodeStyle(node, state),
            ].join(' ')}
          >
            {node.isTarget ? '◈' : node.kind === 'alpha' ? 'α' : 'β'}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        Quadrado = Alfa · círculo = Beta · ◈ = alvo. Clique no nó anterior para desfazer.
      </p>
    </div>
  );
}
