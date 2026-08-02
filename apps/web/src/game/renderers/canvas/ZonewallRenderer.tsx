import { useEffect } from 'react';
import type { ZonewallState } from '@hub/game-core';
import { CanvasStage, type DrawFn } from './CanvasStage.js';
import type { RendererProps } from '../types.js';

const COLORS = {
  trackActive: '#1B2430',
  trackDim: '#12181F',
  trackHit: '#173028',
  trackMiss: '#301418',
  zone: '#3FD0C9',
  zoneDim: 'rgba(63, 208, 201, 0.3)',
  bar: '#F0A831',
  hit: '#3FD0C9',
  miss: '#FF4155',
};

const ROW_GAP = 6;

const draw: DrawFn = (ctx, controller, { width, height }) => {
  const state = controller.snapshot().state as ZonewallState;
  const rows = state.rows;
  if (rows.length === 0) return;

  const rowHeight = (height - ROW_GAP * (rows.length - 1)) / rows.length;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.font = `${Math.max(12, Math.round(rowHeight * 0.55))}px monospace`;

  rows.forEach((row, i) => {
    const y = i * (rowHeight + ROW_GAP);
    const isActive = i === state.activeRowIndex;
    const isResolved = row.outcome !== 'pending';
    const isPulsing = i === state.lastResolvedIndex && (state.flash > 0 || state.errorFlash > 0);

    // Trilha da linha: destaque forte na ativa, esmaecida nas demais.
    ctx.globalAlpha = isActive ? 1 : isResolved ? 0.6 : 0.4;
    ctx.fillStyle = isResolved
      ? row.outcome === 'hit' ? COLORS.trackHit : COLORS.trackMiss
      : isActive ? COLORS.trackActive : COLORS.trackDim;
    ctx.fillRect(0, y, width, rowHeight);

    // Zona-alvo da linha.
    const zx = row.zoneStart * width;
    const zw = Math.max(2, (row.zoneEnd - row.zoneStart) * width);
    ctx.fillStyle = isActive ? COLORS.zone : COLORS.zoneDim;
    ctx.fillRect(zx, y, zw, rowHeight);
    ctx.globalAlpha = 1;

    // Pulso de acerto/erro na linha recém-resolvida.
    if (isPulsing) {
      ctx.globalAlpha = row.outcome === 'hit' ? 0.35 : 0.45;
      ctx.fillStyle = row.outcome === 'hit' ? COLORS.hit : COLORS.miss;
      ctx.fillRect(0, y, width, rowHeight);
      ctx.globalAlpha = 1;
    }

    // Marcador de linha resolvida.
    if (isResolved) {
      ctx.fillStyle = row.outcome === 'hit' ? COLORS.hit : COLORS.miss;
      ctx.fillText(row.outcome === 'hit' ? '✓' : '✗', width - 8, y + rowHeight / 2);
    }

    // Barra móvel — só existe na linha ativa.
    if (isActive) {
      const barX = state.bar * width;
      ctx.fillStyle = COLORS.bar;
      ctx.globalAlpha = state.flash > 0 ? 0.4 : 0.22;
      ctx.fillRect(barX - 8, y - 4, 16, rowHeight + 8);
      ctx.globalAlpha = 1;
      ctx.fillRect(barX - 1.5, y - 6, 3, rowHeight + 12);
    }
  });
};

export function ZonewallRenderer({ controller, snapshot, sendInput, level }: RendererProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      sendInput({ type: 'key', code: event.code });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendInput]);

  const state = snapshot.state as ZonewallState;
  const rowsRemaining = state.rows.length - state.activeRowIndex;
  // Mais linhas precisam de um palco mais alto — o traço nunca é uma trilha única.
  // O teto fica conservador para o nível 5 (9 linhas) não forçar rolagem.
  const aspect = Math.max(0.4, Math.min(0.65, state.rows.length * 0.075));

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className="text-phosphor">acertos necessários {state.hits}/{state.hitsNeeded}</span>
        {level <= 2 && (
          <>
            <span aria-hidden="true">·</span>
            <span>linhas restantes {rowsRemaining}</span>
          </>
        )}
      </p>
      <CanvasStage
        controller={controller}
        draw={draw}
        aspect={aspect}
        onPointer={(point) => sendInput({ type: 'pointer', x: point.x, y: point.y })}
      />
    </div>
  );
}
