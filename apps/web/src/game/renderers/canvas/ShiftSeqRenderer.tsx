import { useEffect } from 'react';
import type { ShiftSeqState } from '@hub/game-core';
import { CanvasStage, type DrawFn } from './CanvasStage.js';
import type { RendererProps } from '../types.js';

const COLORS = {
  grid: '#1B2430',
  home: '#F0A831',
  homeDanger: '#FF4155',
  node: '#FF4155',
  nodeDestroyed: 'rgba(255, 65, 85, 0.15)',
  healthBg: '#301418',
  healthFill: '#FF4155',
  player: '#C6D2E0',
  attack: '#F0A831',
  attackLabel: '#6B7A8D',
  pulseTarget: '#F0A831',
  pulseWindow: '#3FD0C9',
  pulseRing: '#F0A831',
  pulseLocked: '#6B7A8D',
};

const DIRECTION_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

/** Um golpe de canvas — recriado a cada render para fechar sobre `level` (a janela verde some do nível 3 em diante). */
const makeDraw = (level: number): DrawFn => (ctx, controller, { width, height }) => {
  const state = controller.snapshot().state as ShiftSeqState;
  const { gridSize } = state;
  if (gridSize === 0) return;
  const cell = width / gridSize;
  const center = (x: number, y: number) => ({ cx: (x + 0.5) * cell, cy: (y + 0.5) * cell });

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(width, i * cell);
    ctx.stroke();
  }

  const atHome = state.playerX === state.homeX && state.playerY === state.homeY;
  const danger = !atHome && state.attacks.some((a) => a.msLeft < 500);
  const home = center(state.homeX, state.homeY);
  const homeHalf = cell * 0.4;

  // Pulso de recarga: sempre visível no Home Node, independente do jogador estar nele.
  const maxRadius = cell * 0.95;
  const targetRadius = maxRadius * state.targetFraction;
  const windowRadius = (maxRadius * (state.rechargeWindowMs / state.pulsePeriodMs)) / 2;
  const locked = state.rechargeLockoutMsLeft > 0;

  if (level <= 2) {
    ctx.strokeStyle = COLORS.pulseWindow;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(2, windowRadius * 2);
    ctx.beginPath();
    ctx.arc(home.cx, home.cy, targetRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = COLORS.pulseTarget;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(home.cx, home.cy, targetRadius, 0, Math.PI * 2);
  ctx.stroke();

  const pulseT = state.pulseElapsedMs / state.pulsePeriodMs;
  ctx.strokeStyle = locked ? COLORS.pulseLocked : COLORS.pulseRing;
  ctx.lineWidth = 3;
  ctx.globalAlpha = locked ? 0.35 : 0.9;
  ctx.beginPath();
  ctx.arc(home.cx, home.cy, maxRadius * pulseT, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Home Node.
  ctx.fillStyle = danger ? COLORS.homeDanger : COLORS.home;
  ctx.globalAlpha = danger ? 0.55 + 0.35 * Math.sin(controller.snapshot().elapsed / 90) : 0.85;
  ctx.fillRect(home.cx - homeHalf, home.cy - homeHalf, homeHalf * 2, homeHalf * 2);
  ctx.globalAlpha = 1;

  // Nós infectados: losango + barra de vida em cima.
  ctx.font = `${Math.max(9, Math.round(cell * 0.16))}px monospace`;
  ctx.textAlign = 'center';
  for (const node of state.nodes) {
    const { cx, cy } = center(node.x, node.y);
    if (node.destroyed) {
      ctx.fillStyle = COLORS.nodeDestroyed;
      ctx.beginPath();
      ctx.moveTo(cx, cy - cell * 0.3);
      ctx.lineTo(cx + cell * 0.3, cy);
      ctx.lineTo(cx, cy + cell * 0.3);
      ctx.lineTo(cx - cell * 0.3, cy);
      ctx.closePath();
      ctx.fill();
      continue;
    }

    const d = cell * 0.32;
    ctx.fillStyle = COLORS.node;
    ctx.beginPath();
    ctx.moveTo(cx, cy - d);
    ctx.lineTo(cx + d, cy);
    ctx.lineTo(cx, cy + d);
    ctx.lineTo(cx - d, cy);
    ctx.closePath();
    ctx.fill();

    const barW = cell * 0.7;
    const barH = Math.max(3, cell * 0.09);
    const barY = cy - d - barH - 6;
    ctx.fillStyle = COLORS.healthBg;
    ctx.fillRect(cx - barW / 2, barY, barW, barH);
    ctx.fillStyle = COLORS.healthFill;
    ctx.fillRect(cx - barW / 2, barY, barW * (node.health / node.maxHealth), barH);

    ctx.fillStyle = COLORS.node;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${node.health}/${node.maxHealth}`, cx, barY - 2);
  }

  // Ataques em trânsito: ponto interpolado + tempo de chegada legível.
  ctx.textBaseline = 'top';
  for (const attack of state.attacks) {
    const origin = center(attack.originX, attack.originY);
    const ax = origin.cx + (home.cx - origin.cx) * attack.progress;
    const ay = origin.cy + (home.cy - origin.cy) * attack.progress;

    ctx.fillStyle = COLORS.attack;
    ctx.beginPath();
    ctx.arc(ax, ay, Math.max(3, cell * 0.09), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.attackLabel;
    ctx.fillText(`${(attack.msLeft / 1000).toFixed(1)}s`, ax, ay + cell * 0.14);
  }

  // Jogador — desenhado por cima de tudo, sempre visível.
  const player = center(state.playerX, state.playerY);
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.cx, player.cy, cell * 0.22, 0, Math.PI * 2);
  ctx.fill();
};

export function ShiftSeqRenderer({ controller, snapshot, sendInput, level }: RendererProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!DIRECTION_CODES.has(event.code) && event.code !== 'Space') return;
      event.preventDefault();
      sendInput({ type: 'key', code: event.code });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendInput]);

  const state = snapshot.state as ShiftSeqState;
  const atHome = state.playerX === state.homeX && state.playerY === state.homeY;
  const soonestMs = state.attacks.length > 0 ? Math.min(...state.attacks.map((a) => a.msLeft)) : null;
  const danger = !atHome && soonestMs !== null && soonestMs < 1_500;
  const batteryPct = state.battery / state.batteryMax;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className="text-threat">nós restantes {state.nodesRemaining}</span>
        {state.rechargeLockoutMsLeft > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-threat">recarga travada {(state.rechargeLockoutMsLeft / 1_000).toFixed(1)}s</span>
          </>
        )}
      </p>

      {danger && (
        <p className="animate-pulse text-center text-xs uppercase tracking-[0.2em] text-threat">
          ⚠ ataque atinge o Home Node em {(soonestMs! / 1_000).toFixed(1)}s — volte já
        </p>
      )}

      <div className="relative">
        <CanvasStage controller={controller} draw={makeDraw(level)} aspect={1} />
        <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-line bg-void/85 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">bateria</p>
          <p className={['font-display text-2xl', batteryPct < 0.3 ? 'text-threat' : 'text-phosphor'].join(' ')}>
            {Math.round(state.battery)}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted">
        WASD move · Espaço ataca sobre um nó infectado ou recarrega no timing certo dentro do Home Node
      </p>
    </div>
  );
}
