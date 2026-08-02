import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

const ALPHABET = '0123456789ABCDEF';

export interface MemCell {
  id: string;
  label: string;
}

export interface MemDefragerState {
  cells: MemCell[];
  columns: number;
  /** 'preview' mostra a sequência; 'input' aceita cliques. */
  stage: 'preview' | 'input';
  /** Célula piscando agora (só em preview). */
  highlighted: string | null;
  /** Células já confirmadas na tentativa atual. */
  entered: string[];
  sequenceLength: number;
  attemptsLeft: number;
}

/**
 * memD3FR4G3R — memory hack.
 * A grade pisca uma sequência de células; depois o jogador precisa repeti-la na
 * mesma ordem. Clique errado zera o progresso da tentativa e consome uma vida.
 */
export class MemDefragerController extends MinigameController<MemDefragerState> {
  readonly id: MinigameId = 'memdefrager';
  readonly renderer: RendererKind = 'dom';
  readonly label = 'memD3FR4G3R';

  private cells: MemCell[] = [];
  private columns = 4;
  private sequence: string[] = [];
  private entered: string[] = [];
  private stage: MemDefragerState['stage'] = 'preview';
  private highlighted: string | null = null;
  private previewIndex = 0;
  private previewTimer = 0;
  private attemptsLeft = 3;

  start(): void {
    this.columns = Math.round(this.num('columns', 4));
    const rows = Math.round(this.num('rows', 4));
    const length = Math.round(this.num('sequenceLength', 5));
    this.attemptsLeft = Math.round(this.num('attempts', 3));

    this.cells = Array.from({ length: this.columns * rows }, (_, i) => ({
      id: `c${i}`,
      label: `${this.rng.pick(ALPHABET.split(''))}${this.rng.pick(ALPHABET.split(''))}`,
    }));

    this.sequence = this.rng.shuffle(this.cells).slice(0, length).map((c) => c.id);
    this.stage = 'preview';
    this.previewIndex = 0;
    this.previewTimer = 0;
    this.markRunning();
  }

  tick(ctx: TickContext): void {
    if (this.isOver() || this.stage !== 'preview') {
      this.elapsed = ctx.elapsed;
      return;
    }
    this.elapsed = ctx.elapsed;
    const flashMs = this.num('flashMs', 520);
    this.previewTimer += ctx.dt;

    if (this.previewTimer >= flashMs) {
      this.previewTimer = 0;
      this.previewIndex += 1;
    }
    if (this.previewIndex >= this.sequence.length) {
      this.stage = 'input';
      this.highlighted = null;
      return;
    }
    // Pisca aceso na primeira metade do slot, apagado na segunda: dá cadência visível.
    this.highlighted = this.previewTimer < flashMs * 0.6 ? (this.sequence[this.previewIndex] ?? null) : null;
  }

  handleInput(input: GameInput): void {
    if (this.isOver() || this.stage !== 'input') return;
    if (input.type !== 'pointer' || !input.targetId) return;

    const expected = this.sequence[this.entered.length];
    if (input.targetId !== expected) {
      this.entered = [];
      this.attemptsLeft -= 1;
      if (this.attemptsLeft <= 0) {
        this.resolve('breached', 'Sequência de memória perdida');
        return;
      }
      this.damage(this.num('missPenalty', 0.34), 'Endereço incorreto');
      return;
    }

    this.entered.push(input.targetId);
    this.reward(80);
    if (this.entered.length === this.sequence.length) this.resolve('blocked');
  }

  getState(): MemDefragerState {
    return {
      cells: this.cells,
      columns: this.columns,
      stage: this.stage,
      highlighted: this.highlighted,
      entered: this.entered,
      sequenceLength: this.sequence.length,
      attemptsLeft: this.attemptsLeft,
    };
  }

  getProgress(): number {
    return this.sequence.length === 0 ? 0 : this.entered.length / this.sequence.length;
  }
}
