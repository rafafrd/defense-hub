import type {
  FeedbackEvent, GameInput, MinigameConfig, MinigameId, Outcome,
  Phase, RendererKind, RunResult, Snapshot, TickContext,
} from './types.js';
import { Rng } from './rng.js';

/**
 * Base de todo minigame. O controller é dono do estado e da regra e nunca sabe
 * como será desenhado. A camada visual só chama start/tick/handleInput e lê
 * snapshot(). Adicionar um minigame novo = criar um controller + um renderer.
 */
export abstract class MinigameController<TState> {
  abstract readonly id: MinigameId;
  abstract readonly renderer: RendererKind;
  /** Rótulo mostrado no HUD durante a partida. */
  abstract readonly label: string;

  protected phase: Phase = 'idle';
  protected elapsed = 0;
  protected integrity = 1;
  protected score = 0;
  protected reason?: string;
  protected readonly rng: Rng;

  private listeners = new Set<(e: FeedbackEvent) => void>();

  constructor(protected readonly config: MinigameConfig) {
    this.rng = new Rng(config.seed);
  }

  /** Monta o desafio a partir da seed e da dificuldade. */
  abstract start(): void;
  /** Avança a simulação em dt fixo. */
  abstract tick(ctx: TickContext): void;
  /** Consome um input já normalizado pela camada visual. */
  abstract handleInput(input: GameInput): void;
  /** Estado serializável lido pelo renderer. */
  abstract getState(): TState;
  /** 0..1 do objetivo cumprido. */
  abstract getProgress(): number;

  onFeedback(fn: (e: FeedbackEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  protected emit(event: FeedbackEvent): void {
    for (const fn of this.listeners) fn(event);
  }

  protected num(key: string, fallback: number): number {
    const value = this.config.difficulty[key];
    return typeof value === 'number' ? value : fallback;
  }

  /** Penaliza a saúde da conexão; zerar significa invasão. */
  protected damage(amount: number, reason: string): void {
    this.integrity = Math.max(0, this.integrity - amount);
    this.emit({ kind: 'miss', intensity: amount });
    if (this.integrity <= 0) this.resolve('breached', reason);
  }

  protected reward(points: number): void {
    this.score += points;
    this.emit({ kind: 'hit' });
  }

  protected resolve(outcome: Outcome, reason?: string): void {
    if (this.isOver()) return;
    this.phase = outcome;
    this.reason = reason;
    this.emit({ kind: 'resolved', outcome, reason });
  }

  protected markRunning(): void {
    this.phase = 'running';
  }

  isOver(): boolean {
    return this.phase === 'blocked' || this.phase === 'breached';
  }

  snapshot(): Snapshot<TState> {
    return {
      phase: this.phase,
      progress: this.getProgress(),
      integrity: this.integrity,
      elapsed: this.elapsed,
      state: this.getState(),
    };
  }

  result(): RunResult {
    return {
      minigameId: this.id,
      outcome: this.phase === 'blocked' ? 'blocked' : 'breached',
      score: Math.round(this.score),
      durationMs: Math.round(this.elapsed),
      seed: this.config.seed,
      reason: this.reason,
    };
  }
}
