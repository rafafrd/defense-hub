import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

/** Velocidade constante dos ataques em trânsito, em células de grade por segundo. */
const ATTACK_SPEED_CELLS_PER_SEC = 3;
/** Duração de um ciclo completo do pulso de recarga, em ms. */
const PULSE_PERIOD_MS = 1_600;
/** Fração do ciclo em que o anel coincide com o contorno-alvo do Home Node. */
const TARGET_FRACTION = 0.82;

const DIRECTION_BY_CODE: Record<string, readonly [number, number]> = {
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export interface InfectedNode {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  destroyed: boolean;
}

interface InternalNode extends InfectedNode {
  /** Contador interno do disparo; suprimido enquanto o jogador ocupa a célula. */
  attackTimerMs: number;
}

export interface TravelingAttack {
  id: string;
  nodeId: string;
  originX: number;
  originY: number;
  /** 0 no disparo, 1 na chegada ao Home Node. */
  progress: number;
  msLeft: number;
}

interface InternalAttack {
  id: string;
  nodeId: string;
  originX: number;
  originY: number;
  progress: number;
  travelMs: number;
}

export interface ShiftSeqState {
  gridSize: number;
  homeX: number;
  homeY: number;
  playerX: number;
  playerY: number;
  nodes: InfectedNode[];
  attacks: TravelingAttack[];
  nodesRemaining: number;
  battery: number;
  batteryMax: number;
  hitCost: number;
  rechargeLockoutMsLeft: number;
  lockoutMs: number;
  pulseElapsedMs: number;
  pulsePeriodMs: number;
  targetFraction: number;
  rechargeWindowMs: number;
}

/**
 * shiftSEQ — combate de grade, recurso e timing.
 * O jogador se move em WASD por uma grade de nós a partir do Home Node. Nós
 * infectados disparam ataques que viajam até o Home Node; um ataque que chega
 * com o jogador fora do Home Node é a ÚNICA forma de perder (dano à saúde da
 * conexão). Estar dentro de um nó infectado suprime os disparos dele; martelar
 * Espaço sobre ele consome bateria e o destrói aos poucos. No Home Node, Espaço
 * no instante certo do pulso recarrega tudo — errar trava a recarga por um tempo.
 */
export class ShiftSeqController extends MinigameController<ShiftSeqState> {
  readonly id: MinigameId = 'shiftseq';
  readonly renderer: RendererKind = 'canvas';
  readonly label = 'shiftSEQ';

  private gridSize = 5;
  private homeX = 2;
  private homeY = 2;
  private playerX = 2;
  private playerY = 2;
  private nodes: InternalNode[] = [];
  private attacks: InternalAttack[] = [];
  private attackSeq = 0;
  private attackIntervalMs = 3_000;
  private homeDamagePercent = 0.1;
  private battery = 100;
  private batteryMax = 100;
  private hitCost = 6;
  private rechargeWindowMs = 300;
  private lockoutMs = 1_200;
  private rechargeLockoutMsLeft = 0;
  private pulseElapsedMs = 0;
  private pulsePeriodMs = PULSE_PERIOD_MS;

  protected setup(): void {
    this.gridSize = Math.max(3, Math.round(this.num('gridSize', 5)));
    const infectedCount = Math.max(1, Math.round(this.num('infectedNodes', 2)));
    const nodeHealth = Math.max(1, Math.round(this.num('nodeHealth', 4)));
    this.attackIntervalMs = this.num('attackIntervalMs', 3_000);
    this.homeDamagePercent = this.num('homeDamagePercent', 0.1);
    this.batteryMax = this.num('batteryMax', 100);
    this.battery = this.batteryMax;
    this.hitCost = this.num('hitCost', 6);
    this.rechargeWindowMs = this.num('rechargeWindowMs', 300);
    this.lockoutMs = this.num('lockoutMs', 1_200);
    this.pulsePeriodMs = PULSE_PERIOD_MS;

    this.homeX = Math.floor(this.gridSize / 2);
    this.homeY = Math.floor(this.gridSize / 2);
    this.playerX = this.homeX;
    this.playerY = this.homeY;

    const cells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (x === this.homeX && y === this.homeY) continue;
        cells.push({ x, y });
      }
    }

    this.nodes = this.rng.shuffle(cells).slice(0, infectedCount).map((c, i) => ({
      id: `n${i}`,
      x: c.x,
      y: c.y,
      health: nodeHealth,
      maxHealth: nodeHealth,
      destroyed: false,
      // Fase inicial sorteada: os nós não disparam todos em sincronia perfeita.
      attackTimerMs: this.rng.float(0, this.attackIntervalMs),
    }));

    this.attacks = [];
    this.attackSeq = 0;
    this.rechargeLockoutMsLeft = 0;
    this.pulseElapsedMs = 0;
  }

  protected onTick(ctx: TickContext): void {
    const dt = ctx.dt;

    if (this.rechargeLockoutMsLeft > 0) {
      this.rechargeLockoutMsLeft = Math.max(0, this.rechargeLockoutMsLeft - dt);
    }
    this.pulseElapsedMs = (this.pulseElapsedMs + dt) % this.pulsePeriodMs;

    for (const node of this.nodes) {
      if (node.destroyed) continue;
      // Dentro do nó, o jogador bloqueia o disparo — o contador nem avança.
      if (node.x === this.playerX && node.y === this.playerY) continue;

      node.attackTimerMs += dt;
      if (node.attackTimerMs >= this.attackIntervalMs) {
        node.attackTimerMs -= this.attackIntervalMs;
        this.spawnAttack(node);
      }
    }

    for (let i = this.attacks.length - 1; i >= 0; i--) {
      const attack = this.attacks[i]!;
      attack.progress += dt / attack.travelMs;
      if (attack.progress >= 1) {
        this.resolveAttack();
        this.attacks.splice(i, 1);
      }
    }
  }

  protected onInput(input: GameInput): void {
    if (input.type !== 'key') return;

    const dir = DIRECTION_BY_CODE[input.code];
    if (dir) {
      this.playerX = clamp(this.playerX + dir[0], 0, this.gridSize - 1);
      this.playerY = clamp(this.playerY + dir[1], 0, this.gridSize - 1);
      return;
    }

    if (input.code !== 'Space') return;
    const atHome = this.playerX === this.homeX && this.playerY === this.homeY;
    if (atHome) this.tryRecharge();
    else this.tryAttack();
  }

  getState(): ShiftSeqState {
    return {
      gridSize: this.gridSize,
      homeX: this.homeX,
      homeY: this.homeY,
      playerX: this.playerX,
      playerY: this.playerY,
      nodes: this.nodes.map(({ attackTimerMs: _attackTimerMs, ...rest }) => rest),
      attacks: this.attacks.map((a) => ({
        id: a.id,
        nodeId: a.nodeId,
        originX: a.originX,
        originY: a.originY,
        progress: a.progress,
        msLeft: Math.max(0, Math.round(a.travelMs * (1 - a.progress))),
      })),
      nodesRemaining: this.nodes.filter((n) => !n.destroyed).length,
      battery: this.battery,
      batteryMax: this.batteryMax,
      hitCost: this.hitCost,
      rechargeLockoutMsLeft: this.rechargeLockoutMsLeft,
      lockoutMs: this.lockoutMs,
      pulseElapsedMs: this.pulseElapsedMs,
      pulsePeriodMs: this.pulsePeriodMs,
      targetFraction: TARGET_FRACTION,
      rechargeWindowMs: this.rechargeWindowMs,
    };
  }

  getProgress(): number {
    if (this.nodes.length === 0) return 0;
    return this.nodes.filter((n) => n.destroyed).length / this.nodes.length;
  }

  private spawnAttack(node: InternalNode): void {
    const dx = this.homeX - node.x;
    const dy = this.homeY - node.y;
    const distance = Math.hypot(dx, dy);
    const travelMs = Math.max(200, (distance / ATTACK_SPEED_CELLS_PER_SEC) * 1000);
    this.attacks.push({
      id: `atk${this.attackSeq++}`,
      nodeId: node.id,
      originX: node.x,
      originY: node.y,
      progress: 0,
      travelMs,
    });
  }

  private resolveAttack(): void {
    const atHome = this.playerX === this.homeX && this.playerY === this.homeY;
    if (atHome) {
      this.reward(10);
      return;
    }
    this.damage(this.homeDamagePercent, 'Ataque atingiu o Home Node sem defesa');
  }

  private tryAttack(): void {
    const node = this.nodes.find((n) => !n.destroyed && n.x === this.playerX && n.y === this.playerY);
    if (!node || this.battery < this.hitCost) return;

    this.battery -= this.hitCost;
    node.health -= 1;
    if (node.health <= 0) {
      node.destroyed = true;
      this.reward(150);
      if (this.nodes.every((n) => n.destroyed)) this.resolve('blocked');
    } else {
      this.reward(20);
    }
  }

  private tryRecharge(): void {
    if (this.rechargeLockoutMsLeft > 0) return;

    const targetMs = this.pulsePeriodMs * TARGET_FRACTION;
    const raw = Math.abs(this.pulseElapsedMs - targetMs);
    const delta = Math.min(raw, this.pulsePeriodMs - raw);

    if (delta <= this.rechargeWindowMs / 2) {
      this.battery = this.batteryMax;
      this.reward(30);
    } else {
      this.rechargeLockoutMsLeft = this.lockoutMs;
      this.emit({ kind: 'miss', intensity: 1 });
    }
  }
}
