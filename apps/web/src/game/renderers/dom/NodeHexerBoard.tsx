import { useEffect } from 'react';
import type { HexNode, NodeHexerState, VerifyFailure } from '@hub/game-core';
import type { RendererProps } from '../types.js';

const VERIFY_TARGET = 'verify';

const FAILURE_MESSAGE: Record<VerifyFailure, string> = {
  discontinuous: 'rota descontínua — há um salto entre nós não vizinhos',
  'same-kind': 'dois nós do mesmo tipo em sequência',
  'missing-targets': 'a rota não cobre todos os nós corrompidos',
};

const formatTime = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function NodeHexerBoard({ snapshot, sendInput, level }: RendererProps) {
  const state = snapshot.state as NodeHexerState;
  // A ajuda visual desaparece cedo, de propósito: este é o hack mais difícil do original.
  const showHalo = level <= 2;
  const showErrorHint = level <= 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Enter') return;
      event.preventDefault();
      sendInput({ type: 'key', code: 'Enter' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendInput]);

  const byId = new Map(state.nodes.map((n) => [n.id, n]));
  const lastId = state.path[state.path.length - 1]!;
  const last = byId.get(lastId)!;

  const haloIds = showHalo
    ? new Set(
        state.nodes
          .filter(
            (n) =>
              !n.isDead &&
              !state.path.includes(n.id) &&
              Math.abs(n.x - last.x) + Math.abs(n.y - last.y) === 1,
          )
          .map((n) => n.id),
      )
    : new Set<string>();

  const brokenLink =
    showErrorHint && state.path.length > 1 && byId.get(state.path[state.path.length - 2]!)!.kind === last.kind;

  const pathPoints = state.path
    .map((id) => {
      const n = byId.get(id)!;
      return `${n.x + 0.5},${n.y + 0.5}`;
    })
    .join(' ');

  const nodeStyle = (node: HexNode): string => {
    const classes = [node.kind === 'alpha' ? 'rounded-none' : 'rounded-full'];
    if (node.isDead) {
      classes.push('border-line bg-panel text-muted opacity-30 cursor-not-allowed');
      return classes.join(' ');
    }

    const inPath = state.path.includes(node.id);
    if (node.id === lastId && brokenLink) classes.push('border-threat bg-threat/25 text-threat animate-shake');
    else if (node.id === state.startId) classes.push('border-phosphor bg-phosphor/20 text-phosphor');
    else if (inPath) classes.push('border-safe bg-safe/20 text-safe');
    else if (node.isTarget) classes.push('border-threat text-threat');
    else if (haloIds.has(node.id)) classes.push('border-ink text-ink');
    else classes.push(node.kind === 'alpha' ? 'border-line text-phosphor/70' : 'border-line text-safe/70');

    return classes.join(' ');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className="text-phosphor">alvos restantes {state.targetsRemaining}</span>
        <span aria-hidden="true">·</span>
        <span className={state.timeLeftMs < 8_000 ? 'text-threat' : ''}>tempo {formatTime(state.timeLeftMs)}</span>
      </p>

      <div className="relative w-full max-w-[22rem]" style={{ aspectRatio: `${state.width} / ${state.height}` }}>
        <svg
          viewBox={`0 0 ${state.width} ${state.height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full text-phosphor"
        >
          {state.path.length > 1 && (
            <polyline
              points={pathPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.06}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}
        </svg>
        <div
          className="absolute inset-0 grid gap-[3%]"
          style={{
            gridTemplateColumns: `repeat(${state.width}, 1fr)`,
            gridTemplateRows: `repeat(${state.height}, 1fr)`,
          }}
        >
          {state.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              disabled={node.isDead}
              onClick={() => sendInput({ type: 'pointer', x: node.x, y: node.y, targetId: node.id })}
              aria-label={`nó ${node.kind} ${node.x},${node.y}${node.isTarget ? ' corrompido' : ''}`}
              className={[
                'flex h-full w-full items-center justify-center border bg-panel text-xs transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor',
                nodeStyle(node),
              ].join(' ')}
            >
              {node.isDead ? '✕' : node.isTarget ? '◈' : node.kind === 'alpha' ? '■' : '●'}
            </button>
          ))}
        </div>
      </div>

      {state.lastVerifyFailure && (
        <p className="text-[11px] text-threat">verificação reprovada: {FAILURE_MESSAGE[state.lastVerifyFailure]}</p>
      )}

      <button
        type="button"
        onClick={() => sendInput({ type: 'pointer', x: 0, y: 0, targetId: VERIFY_TARGET })}
        className="border border-phosphor bg-phosphor/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-phosphor transition-colors hover:bg-phosphor/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor"
      >
        verificar rota (Enter)
      </button>

      <p className="text-[11px] text-muted">
        Quadrado = Alfa · círculo = Beta · ◈ = corrompido. Clique no nó anterior para desfazer.
      </p>
    </div>
  );
}
