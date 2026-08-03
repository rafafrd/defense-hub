import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

export type NodeKind = 'alpha' | 'beta';

export interface HexNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  isTarget: boolean;
  /** Nó de ruído que nunca pode entrar na rota — níveis 4-5. */
  isDead: boolean;
}

export type VerifyFailure = 'discontinuous' | 'same-kind' | 'missing-targets';

export interface NodeHexerState {
  nodes: HexNode[];
  width: number;
  height: number;
  startId: string;
  /** Caminho traçado, do nó inicial até o último nó clicado. Aceita quebras de
   * alternância — só a verificação reprova. */
  path: string[];
  targetsRemaining: number;
  timeLeftMs: number;
  timeLimitMs: number;
  /** Motivo da última verificação reprovada; null antes da primeira tentativa
   * ou depois de qualquer avanço no traçado. */
  lastVerifyFailure: VerifyFailure | null;
}

/** targetId reservado para o botão "verificar rota"; nunca colide com `n${x}-${y}`. */
const VERIFY_TARGET = 'verify';

const FAILURE_REASON: Record<VerifyFailure, string> = {
  discontinuous: 'Rota descontínua na verificação',
  'same-kind': 'Nós do mesmo tipo conectados em sequência',
  'missing-targets': 'Rota não cobre todos os nós corrompidos',
};

/**
 * nodeH3X3R — puzzle de conexões.
 * O jogador traça o caminho livremente: uma ligação entre nós do mesmo tipo
 * NÃO quebra a conexão na hora, ela só é reprovada quando a rota é VERIFICADA
 * (botão "verificar rota" ou Enter). A verificação cobra 4 coisas: alternância
 * Alfa/Beta a cada passo, continuidade (sem saltos), nenhum nó repetido e
 * cobertura de todos os nós corrompidos (alvos). Alcançar um alvo estende o
 * cronômetro. Nós "mortos" (níveis 4-5) nunca entram na rota.
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
  private timeLimitMs = 45_000;
  private hardCollapse = false;
  private lastVerifyFailure: VerifyFailure | null = null;

  protected setup(): void {
    this.width = this.rng.int(Math.round(this.num('widthMin', 5)), Math.round(this.num('widthMax', 5)));
    this.height = this.rng.int(Math.round(this.num('heightMin', 5)), Math.round(this.num('heightMax', 5)));
    const targetCount = Math.round(this.num('targets', 4));
    const deadCount = Math.round(this.num('deadNodes', 0));
    this.timeLimitMs = this.num('timeBaseMs', 45_000);
    this.hardCollapse = this.config.difficulty.hardCollapse === true;

    this.nodes = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.nodes.push({
          id: `n${x}-${y}`,
          x,
          y,
          // Sorteado, não em xadrez: ligações adjacentes do mesmo tipo precisam
          // ser possíveis para que a verificação tenha algo real a reprovar.
          kind: this.rng.pick(['alpha', 'beta'] as const),
          isTarget: false,
          isDead: false,
        });
      }
    }

    const start = this.rng.pick(this.nodes);
    this.startId = start.id;
    const candidates = this.rng.shuffle(this.nodes.filter((n) => n.id !== start.id));
    for (const node of candidates.slice(0, targetCount)) node.isTarget = true;
    for (const node of candidates.slice(targetCount, targetCount + deadCount)) node.isDead = true;

    this.path = [this.startId];
    this.lastVerifyFailure = null;
  }

  protected onTick(ctx: TickContext): void {
    if (this.timeLimitMs > 0 && ctx.elapsed >= this.timeLimitMs) {
      this.resolve('breached', 'Tempo esgotado no traçado');
    }
  }

  protected onInput(input: GameInput): void {
    if (input.type === 'key') {
      if (input.code === 'Enter') this.verify();
      return;
    }
    if (input.type !== 'pointer' || !input.targetId) return;
    if (input.targetId === VERIFY_TARGET) {
      this.verify();
      return;
    }

    const node = this.nodes.find((n) => n.id === input.targetId);
    if (!node || node.isDead) return;

    // Desfazer o último passo: sempre permitido, sem custo.
    if (this.path.length > 1 && node.id === this.path[this.path.length - 2]) {
      this.path.pop();
      return;
    }

    // Nó já visitado (e não é o passo anterior): recusado no traçado, sem penalidade.
    if (this.path.includes(node.id)) return;

    const lastId = this.path[this.path.length - 1]!;
    const last = this.nodes.find((n) => n.id === lastId)!;
    const adjacent = Math.abs(node.x - last.x) + Math.abs(node.y - last.y) === 1;
    if (!adjacent) return;

    // A alternância Alfa/Beta só é cobrada na verificação: o traçado aceita
    // qualquer vizinho livre, mesmo repetindo o tipo do nó anterior.
    this.path.push(node.id);
    this.lastVerifyFailure = null;

    if (node.isTarget) {
      this.timeLimitMs += this.num('bonusPerTargetMs', 0);
      this.reward(120);
    }
  }

  getState(): NodeHexerState {
    return {
      nodes: this.nodes,
      width: this.width,
      height: this.height,
      startId: this.startId,
      path: this.path,
      targetsRemaining: this.targetsRemaining(),
      timeLeftMs: Math.max(0, this.timeLimitMs - this.elapsed),
      timeLimitMs: this.timeLimitMs,
      lastVerifyFailure: this.lastVerifyFailure,
    };
  }

  getProgress(): number {
    const targets = this.nodes.filter((n) => n.isTarget);
    if (targets.length === 0) return 0;
    return targets.filter((n) => this.path.includes(n.id)).length / targets.length;
  }

  private verify(): void {
    const failure = this.checkRoute();
    this.lastVerifyFailure = failure;
    if (!failure) {
      this.resolve('blocked');
      return;
    }

    this.damage(this.num('breakPenalty', 0.25), FAILURE_REASON[failure]);
    if (this.hardCollapse) this.path = [this.startId];
  }

  private checkRoute(): VerifyFailure | null {
    for (let i = 1; i < this.path.length; i++) {
      const prev = this.nodes.find((n) => n.id === this.path[i - 1])!;
      const curr = this.nodes.find((n) => n.id === this.path[i])!;
      const adjacent = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y) === 1;
      if (!adjacent) return 'discontinuous';
      if (curr.kind === prev.kind) return 'same-kind';
    }

    if (this.targetsRemaining() > 0) return 'missing-targets';
    return null;
  }

  private targetsRemaining(): number {
    return this.nodes.filter((n) => n.isTarget && !this.path.includes(n.id)).length;
  }
}
