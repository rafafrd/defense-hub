import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

export interface StackNode {
  id: string;
  x: number;
  y: number;
}

export interface SkullNode {
  id: string;
  x: number;
  y: number;
  /** Sempre true fora do modo oculto; nos níveis 4-5 só vira true perto do Pusher. */
  revealed: boolean;
}

export type Selection = { kind: 'pusher' } | { kind: 'stack'; stackId: string } | null;

export interface StackPusherState {
  gridSize: number;
  pusherX: number;
  pusherY: number;
  deleteX: number;
  deleteY: number;
  stacks: StackNode[];
  skulls: SkullNode[];
  selection: Selection;
  stacksRemaining: number;
  moves: number;
  /** 0 = sem limite. */
  moveLimit: number;
  timeLeftMs: number;
  timeLimitMs: number;
}

interface Layout {
  pusherX: number;
  pusherY: number;
  deleteX: number;
  deleteY: number;
  stacks: StackNode[];
  skulls: Array<{ id: string; x: number; y: number }>;
}

const key = (x: number, y: number): string => `${x}-${y}`;
const chebyshev = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

/**
 * stackPUSHER — puzzle físico de blocos.
 * O Pusher se move em dois cliques (pega, solta em qualquer casa livre do
 * tabuleiro). Um Stack só pode ser selecionado e solto dentro do raio 3x3 ao
 * redor da posição ATUAL do Pusher — por isso o Pusher precisa ser reposicionado
 * o tempo todo para "carregar" um Stack célula a célula até o nó Delete.
 * Clicar numa caveira, ou soltar Pusher/Stack sobre ela, derruba o hack na hora.
 * O layout é gerado com uma busca de alcançabilidade a partir do estado inicial
 * (tratando caveiras como o único obstáculo real) e re-sorteado se algum Stack
 * não tiver como chegar ao Delete — um puzzle impossível é bug, não dificuldade.
 */
export class StackPusherController extends MinigameController<StackPusherState> {
  readonly id: MinigameId = 'stackpusher';
  readonly renderer: RendererKind = 'dom';
  readonly label = 'stackPUSHER';

  private gridSize = 5;
  private pusherX = 0;
  private pusherY = 0;
  private deleteX = 0;
  private deleteY = 0;
  private stacks: StackNode[] = [];
  private skulls: SkullNode[] = [];
  private selection: Selection = null;
  private totalStacks = 0;
  private moves = 0;
  private moveLimit = 0;
  private timeLimitMs = 0;
  private skullsHidden = false;

  protected setup(): void {
    const gridMin = Math.max(3, Math.round(this.num('gridSizeMin', 5)));
    const gridMax = Math.max(gridMin, Math.round(this.num('gridSizeMax', gridMin)));
    this.gridSize = this.rng.int(gridMin, gridMax);

    const stackCount = Math.max(1, Math.round(this.num('stacks', 2)));
    const skullCount = Math.max(0, Math.round(this.num('skulls', 0)));
    this.skullsHidden = this.config.difficulty.skullsHidden === true;
    this.timeLimitMs = this.num('timeLimitMs', 0);
    this.moveLimit = Math.max(0, Math.round(this.num('moveLimit', 0)));

    this.moves = 0;
    this.selection = null;

    const layout = this.generateSolvableLayout(stackCount, skullCount);
    this.pusherX = layout.pusherX;
    this.pusherY = layout.pusherY;
    this.deleteX = layout.deleteX;
    this.deleteY = layout.deleteY;
    this.stacks = layout.stacks;
    this.skulls = layout.skulls.map((s) => ({ ...s, revealed: !this.skullsHidden }));
    this.totalStacks = this.stacks.length;

    this.revealNearbySkulls();
  }

  protected onTick(ctx: TickContext): void {
    if (this.timeLimitMs > 0 && ctx.elapsed >= this.timeLimitMs) {
      this.resolve('breached', 'Tempo esgotado');
    }
  }

  protected onInput(input: GameInput): void {
    if (input.type !== 'pointer' || !input.targetId) return;
    const [xs, ys] = input.targetId.split('-');
    const x = Number(xs);
    const y = Number(ys);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) return;

    // Clicar numa caveira — revelada ou não — derruba o hack na hora.
    if (this.skulls.some((s) => s.x === x && s.y === y)) {
      this.resolve('breached', 'Caveira ativada');
      return;
    }

    if (this.selection === null) {
      if (x === this.pusherX && y === this.pusherY) {
        this.selection = { kind: 'pusher' };
        return;
      }
      const stack = this.stacks.find((s) => s.x === x && s.y === y);
      if (stack && this.inPusherRadius(stack.x, stack.y)) {
        this.selection = { kind: 'stack', stackId: stack.id };
      }
      return;
    }

    if (this.selection.kind === 'pusher') {
      if (x === this.pusherX && y === this.pusherY) {
        this.selection = null;
        return;
      }
      if (this.isOccupied(x, y)) return;

      this.pusherX = x;
      this.pusherY = y;
      this.selection = null;
      this.revealNearbySkulls();
      this.registerMove();
      return;
    }

    const selectedStackId = this.selection.stackId;
    const stack = this.stacks.find((s) => s.id === selectedStackId)!;
    if (x === stack.x && y === stack.y) {
      this.selection = null;
      return;
    }
    if (!this.inPusherRadius(x, y) || !this.inPusherRadius(stack.x, stack.y)) return;
    if (this.isOccupied(x, y)) return;

    stack.x = x;
    stack.y = y;
    this.selection = null;
    this.registerMove();

    if (x === this.deleteX && y === this.deleteY) {
      this.stacks = this.stacks.filter((s) => s.id !== stack.id);
      this.reward(150);
      if (this.stacks.length === 0) this.resolve('blocked');
    }
  }

  getState(): StackPusherState {
    return {
      gridSize: this.gridSize,
      pusherX: this.pusherX,
      pusherY: this.pusherY,
      deleteX: this.deleteX,
      deleteY: this.deleteY,
      stacks: this.stacks,
      skulls: this.skulls,
      selection: this.selection,
      stacksRemaining: this.stacks.length,
      moves: this.moves,
      moveLimit: this.moveLimit,
      timeLeftMs: this.timeLimitMs > 0 ? Math.max(0, this.timeLimitMs - this.elapsed) : 0,
      timeLimitMs: this.timeLimitMs,
    };
  }

  getProgress(): number {
    if (this.totalStacks === 0) return 0;
    return (this.totalStacks - this.stacks.length) / this.totalStacks;
  }

  private inPusherRadius(x: number, y: number): boolean {
    return chebyshev(x, y, this.pusherX, this.pusherY) <= 1;
  }

  private isOccupied(x: number, y: number): boolean {
    if (x === this.pusherX && y === this.pusherY) return true;
    return this.stacks.some((s) => s.x === x && s.y === y);
  }

  private registerMove(): void {
    this.moves += 1;
    if (this.moveLimit > 0 && this.moves > this.moveLimit) {
      this.resolve('breached', 'Limite de movimentos excedido');
    }
  }

  private revealNearbySkulls(): void {
    if (!this.skullsHidden) return;
    for (const skull of this.skulls) {
      if (!skull.revealed && this.inPusherRadius(skull.x, skull.y)) skull.revealed = true;
    }
  }

  private generateSolvableLayout(stackCount: number, skullCount: number): Layout {
    const cells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) cells.push({ x, y });
    }

    const maxAttempts = 300;
    let attempt = this.buildAttempt(cells, stackCount, skullCount);
    for (let i = 0; i < maxAttempts && !this.isSolvable(attempt); i++) {
      attempt = this.buildAttempt(cells, stackCount, skullCount);
    }
    return attempt;
  }

  private buildAttempt(cells: Array<{ x: number; y: number }>, stackCount: number, skullCount: number): Layout {
    const shuffled = this.rng.shuffle(cells);
    let i = 0;
    const deleteCell = shuffled[i++]!;
    const pusherCell = shuffled[i++]!;
    const stacks = Array.from({ length: stackCount }, (_, idx) => {
      const c = shuffled[i++]!;
      return { id: `s${idx}`, x: c.x, y: c.y };
    });
    const skulls = Array.from({ length: skullCount }, (_, idx) => {
      const c = shuffled[i++]!;
      return { id: `k${idx}`, x: c.x, y: c.y };
    });
    return { pusherX: pusherCell.x, pusherY: pusherCell.y, deleteX: deleteCell.x, deleteY: deleteCell.y, stacks, skulls };
  }

  /** Busca de alcançabilidade: cada Stack precisa ter um caminho de "saltos" (via alguma posição
   * válida do Pusher) até o Delete, tratando só as caveiras como obstáculo real. */
  private isSolvable(layout: Layout): boolean {
    const skullSet = new Set(layout.skulls.map((s) => key(s.x, s.y)));

    const hasPusherSpot = (ax: number, ay: number, bx: number, by: number): boolean => {
      const pxMin = Math.max(0, Math.max(ax, bx) - 1);
      const pxMax = Math.min(this.gridSize - 1, Math.min(ax, bx) + 1);
      const pyMin = Math.max(0, Math.max(ay, by) - 1);
      const pyMax = Math.min(this.gridSize - 1, Math.min(ay, by) + 1);
      for (let px = pxMin; px <= pxMax; px++) {
        for (let py = pyMin; py <= pyMax; py++) {
          if (px === ax && py === ay) continue;
          if (px === bx && py === by) continue;
          if (skullSet.has(key(px, py))) continue;
          return true;
        }
      }
      return false;
    };

    const reachable = (startX: number, startY: number): boolean => {
      if (startX === layout.deleteX && startY === layout.deleteY) return true;
      const visited = new Set([key(startX, startY)]);
      const queue: Array<[number, number]> = [[startX, startY]];
      while (queue.length > 0) {
        const [ax, ay] = queue.shift()!;
        const bxMin = Math.max(0, ax - 2);
        const bxMax = Math.min(this.gridSize - 1, ax + 2);
        const byMin = Math.max(0, ay - 2);
        const byMax = Math.min(this.gridSize - 1, ay + 2);
        for (let bx = bxMin; bx <= bxMax; bx++) {
          for (let by = byMin; by <= byMax; by++) {
            if (bx === ax && by === ay) continue;
            const k = key(bx, by);
            if (visited.has(k) || skullSet.has(k)) continue;
            if (!hasPusherSpot(ax, ay, bx, by)) continue;
            if (bx === layout.deleteX && by === layout.deleteY) return true;
            visited.add(k);
            queue.push([bx, by]);
          }
        }
      }
      return false;
    };

    return layout.stacks.every((s) => reachable(s.x, s.y));
  }
}
