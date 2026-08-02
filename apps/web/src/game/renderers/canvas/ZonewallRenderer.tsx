import { useEffect } from 'react';
import type { ZonewallState } from '@hub/game-core';
import { CanvasStage, type DrawFn } from './CanvasStage.js';
import type { RendererProps } from '../types.js';

const COLORS = {
  track: '#1B2430',
  safe: '#3FD0C9',
  hostile: '#FF4155',
  bar: '#F0A831',
  done: '#2A3A48',
};

const draw: DrawFn = (ctx, controller, { width, height }) => {
  const state = controller.snapshot().state as ZonewallState;
  const trackY = height / 2;
  const trackHeight = Math.max(26, height * 0.34);
  const top = trackY - trackHeight / 2;

  ctx.fillStyle = COLORS.track;
  ctx.fillRect(0, top, width, trackHeight);

  for (const zone of state.zones) {
    const x = zone.start * width;
    const w = Math.max(2, (zone.end - zone.start) * width);
    ctx.fillStyle = zone.kind === 'hostile' ? COLORS.hostile : zone.hit ? COLORS.done : COLORS.safe;
    ctx.globalAlpha = zone.kind === 'hostile' ? 0.75 : 1;
    ctx.fillRect(x, top, w, trackHeight);
    ctx.globalAlpha = 1;
  }

  // Barra móvel: linha fina com halo, para o instante do clique ficar legível.
  const barX = state.bar * width;
  ctx.fillStyle = COLORS.bar;
  ctx.globalAlpha = state.flash > 0 ? 0.35 : 0.18;
  ctx.fillRect(barX - 8, top - 6, 16, trackHeight + 12);
  ctx.globalAlpha = 1;
  ctx.fillRect(barX - 1.5, top - 10, 3, trackHeight + 20);
};

export function ZonewallRenderer({ controller, sendInput }: RendererProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      sendInput({ type: 'key', code: event.code });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendInput]);

  return (
    <CanvasStage
      controller={controller}
      draw={draw}
      onPointer={(point) => sendInput({ type: 'pointer', x: point.x, y: point.y })}
    />
  );
}
