import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

const ALPHABET = '0123456789ABCDEF';
/** A partir do nível 4: glifos deliberadamente confundíveis (0/O, 1/I/l, 5/S, 8/B). */
const CONFUSABLE_ALPHABET = '01IlO5S8B';

/** targetId reservado para o clique no bloco central — nunca colide com `c${i}`. */
const REPLAY_TARGET = 'central';

export interface MemCell {
  id: string;
  label: string;
}

export interface MemDefragerState {
  cells: MemCell[];
  gridSize: number;
  /** 'showing' exibe a sequência no bloco central; 'input' aceita cliques na grade. */
  stage: 'showing' | 'input';
  /** Rótulo mostrado no bloco central durante 'showing'; null fora da exibição. */
  centralDisplay: string | null;
  /** Células já confirmadas na rodada atual. */
  entered: string[];
  sequenceLength: number;
  round: number;
  totalRounds: number;
  replaysLeft: number;
  attemptsLeft: number;
}

/**
 * memD3FR4G3R — memory hack.
 * A sequência-alvo é exibida dentro do bloco central (a grade nunca pisca); o
 * jogador memoriza e clica as células correspondentes na grade, na mesma ordem.
 * O hack pode ter várias rodadas — cada rodada bloqueada sorteia uma sequência
 * nova e mais longa a partir da mesma grade fixa. Um clique errado só zera a
 * rodada atual (mesma sequência, tentativa nova); as tentativas são do hack
 * inteiro. Reprisar a exibição consome um replay — recurso limitado por nível.
 */
export class MemDefragerController extends MinigameController<MemDefragerState> {
  readonly id: MinigameId = 'memdefrager';
  readonly renderer: RendererKind = 'dom';
  readonly label = 'memD3FR4G3R';

  private cells: MemCell[] = [];
  private gridSize = 4;
  private roundLengths: number[] = [5];
  private sequence: string[] = [];
  private entered: string[] = [];
  private stage: MemDefragerState['stage'] = 'showing';
  private centralDisplay: string | null = null;
  private previewIndex = 0;
  private previewTimer = 0;
  private round = 1;
  private totalRounds = 1;
  private replaysLeft = 0;
  private attemptsLeft = 3;
  private totalAttempts = 3;

  protected setup(): void {
    this.gridSize = Math.max(2, Math.round(this.num('gridSize', 4)));
    this.totalRounds = Math.max(1, Math.round(this.num('rounds', 1)));
    this.roundLengths = String(this.config.difficulty.roundLengths ?? '5')
      .split(',')
      .map((n) => Math.max(1, Math.round(Number(n))));
    this.replaysLeft = Math.max(0, Math.round(this.num('replays', 1)));
    this.totalAttempts = Math.max(1, Math.round(this.num('attempts', 3)));
    this.attemptsLeft = this.totalAttempts;

    const alphabet = this.config.level >= 4 ? CONFUSABLE_ALPHABET : ALPHABET;
    const pool = alphabet.split('');
    this.cells = Array.from({ length: this.gridSize * this.gridSize }, (_, i) => ({
      id: `c${i}`,
      label: `${this.rng.pick(pool)}${this.rng.pick(pool)}`,
    }));

    this.round = 1;
    this.startRound();
  }

  protected onTick(ctx: TickContext): void {
    if (this.stage !== 'showing') return;
    const itemMs = this.num('itemMs', 500);
    this.previewTimer += ctx.dt;

    if (this.previewTimer >= itemMs) {
      this.previewTimer = 0;
      this.previewIndex += 1;
    }

    if (this.previewIndex >= this.sequence.length) {
      this.stage = 'input';
      this.centralDisplay = null;
      return;
    }
    // Aceso na maior parte do slot, apagado no fim: separa itens consecutivos iguais.
    this.centralDisplay = this.previewTimer < itemMs * 0.7
      ? this.labelFor(this.sequence[this.previewIndex])
      : null;
  }

  protected onInput(input: GameInput): void {
    if (input.type !== 'pointer' || !input.targetId) return;

    if (input.targetId === REPLAY_TARGET) {
      if (this.stage !== 'input' || this.replaysLeft <= 0) return;
      this.replaysLeft -= 1;
      this.startShowing();
      return;
    }

    if (this.stage !== 'input') return;

    const expected = this.sequence[this.entered.length];
    if (input.targetId !== expected) {
      this.entered = [];
      this.attemptsLeft -= 1;
      const reason = this.attemptsLeft <= 0 ? 'Sequência de memória perdida' : 'Endereço incorreto';
      this.damage(1 / this.totalAttempts, reason);
      return;
    }

    this.entered.push(input.targetId);
    this.reward(80);

    if (this.entered.length === this.sequence.length) {
      if (this.round >= this.totalRounds) {
        this.resolve('blocked');
      } else {
        this.round += 1;
        this.startRound();
      }
    }
  }

  getState(): MemDefragerState {
    return {
      cells: this.cells,
      gridSize: this.gridSize,
      stage: this.stage,
      centralDisplay: this.centralDisplay,
      entered: this.entered,
      sequenceLength: this.sequence.length,
      round: this.round,
      totalRounds: this.totalRounds,
      replaysLeft: this.replaysLeft,
      attemptsLeft: this.attemptsLeft,
    };
  }

  getProgress(): number {
    if (this.totalRounds === 0) return 0;
    const roundsDone = this.round - 1;
    const roundProgress = this.sequence.length === 0 ? 0 : this.entered.length / this.sequence.length;
    return Math.min(1, (roundsDone + roundProgress) / this.totalRounds);
  }

  private startRound(): void {
    const length = this.roundLengths[this.round - 1] ?? this.roundLengths[this.roundLengths.length - 1]!;
    this.sequence = this.rng.shuffle(this.cells).slice(0, length).map((c) => c.id);
    this.entered = [];
    this.startShowing();
  }

  private startShowing(): void {
    this.stage = 'showing';
    this.previewIndex = 0;
    this.previewTimer = 0;
    this.centralDisplay = this.labelFor(this.sequence[0]);
  }

  private labelFor(cellId: string | undefined): string | null {
    if (!cellId) return null;
    return this.cells.find((c) => c.id === cellId)?.label ?? null;
  }
}
