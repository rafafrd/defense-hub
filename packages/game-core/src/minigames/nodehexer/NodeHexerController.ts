import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

export type NodeKind = 'alpha' | 'beta';

export interface HexNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  isTarget: boolean;
}

export interface NodeHexerState {
  nodes: HexNode[];
  width: number;
  height: number;
  startId: string;
  /** Caminho traçado, do nó inicial até o último nó válido. */
  path: string[];
  /** Última tentativa inválida — o renderer usa para pintar a quebra em vermelho. */
  lastInvalidId: string | null;
  targetsRemaining: number;
}

/**
 * nodeH3X3R — puzzle de conexões.
 * Regra crítica: a linha precisa alternar Alfa -> Beta -> Alfa. Ligar dois nós do
 * mesmo tipo é movimento inválido e quebra a conexão (o caminho volta ao início).
 */
export class NodeHexerController extends MinigameController<NodeHexerState> {
  readonly id: MinigameId = 'nodehexer';
  readonly renderer: RendererKind = 'dom';
  readonly label = 'nodeH3X3R';

  private nodes: HexNode[] = [];
  private width = 5;
  private height = 5;
  private startId = 'n0';
  private path: string[] = [];
  private lastInvalidId: string | null = null;

  protected setup(): void {
    this.width = Math.round(this.num('width', 5));
    this.height = Math.round(this.num('height', 5));
    const targetCount = Math.round(this.num('targets', 4));

    this.nodes = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.nodes.push({
          id: `n${x}-${y}`,
          x,
          y,
          // Tabuleiro em xadrez garante que sempre exista caminho alternado.
          kind: (x + y) % 2 === 0 ? 'alpha' : 'beta',
          isTarget: false,
        });
      }
    }

    const start = this.rng.pick(this.nodes);
    this.startId = start.id;
    const candidates = this.nodes.filter((n) => n.id !== start.id);
    for (const node of this.rng.shuffle(candidates).slice(0, targetCount)) node.isTarget = true;

    this.path = [this.startId];
  }

  protected onTick(ctx: TickContext): void {
    const limit = this.num('timeLimitMs', 45_000);
    if (limit > 0 && ctx.elapsed >= limit) {
      this.resolve('breached', 'Tempo esgotado no traçado');
    }
  }

  protected onInput(input: GameInput): void {
    if (input.type !== 'pointer' || !input.targetId) return;

    const node = this.nodes.find((n) => n.id === input.targetId);
    const lastId = this.path[this.path.length - 1];
    const last = this.nodes.find((n) => n.id === lastId);
    if (!node || !last) return;

    // Clicar no nó anterior desfaz um passo, sem penalidade.
    if (this.path.length > 1 && node.id === this.path[this.path.length - 2]) {
      this.path.pop();
      return;
    }

    const adjacent = Math.abs(node.x - last.x) + Math.abs(node.y - last.y) === 1;
    const alternates = node.kind !== last.kind;
    const unvisited = !this.path.includes(node.id);

    if (!adjacent || !alternates || !unvisited) {
      this.lastInvalidId = node.id;
      this.path = [this.startId];
      this.damage(this.num('breakPenalty', 0.25), alternates ? 'Salto inválido' : 'Nós do mesmo tipo conectados');
      return;
    }

    this.lastInvalidId = null;
    this.path.push(node.id);
    if (node.isTarget) this.reward(120);

    if (this.targetsRemaining() === 0) this.resolve('blocked');
  }

  getState(): NodeHexerState {
    return {
      nodes: this.nodes,
      width: this.width,
      height: this.height,
      startId: this.startId,
      path: this.path,
      lastInvalidId: this.lastInvalidId,
      targetsRemaining: this.targetsRemaining(),
    };
  }

  getProgress(): number {
    const targets = this.nodes.filter((n) => n.isTarget);
    if (targets.length === 0) return 0;
    return targets.filter((n) => this.path.includes(n.id)).length / targets.length;
  }

  private targetsRemaining(): number {
    return this.nodes.filter((n) => n.isTarget && !this.path.includes(n.id)).length;
  }
}
