import type {
  FeedbackEvent, GameInput, MinigameConfig, MinigameId, Outcome,
  Phase, RendererKind, RunResult, Snapshot, TickContext,
} from './types.js';
import { Rng } from './rng.js';

/** Duração fixa da contagem regressiva antes de todo hack, em ms. */
export const ARMING_MS = 3000;

/**
 * Base de todo minigame. O controller é dono do estado e da regra e nunca sabe
 * como será desenhado. A camada visual só chama start/tick/handleInput e lê
 * snapshot(). Adicionar um minigame novo = criar um controller + um renderer.
 *
 * start/tick/handleInput são métodos template: a base cuida da fase 'arming'
 * (contagem regressiva de 3s antes de tudo) e delega a regra específica para
 * setup/onTick/onInput. Nenhum controller precisa saber que a fase existe.
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

  private armingMsLeft = 0;
  private listeners = new Set<(e: FeedbackEvent) => void>();

  constructor(protected readonly config: MinigameConfig) {
    this.rng = new Rng(config.seed);
  }

  /** Monta o desafio a partir da seed e da dificuldade, sem iniciar a partida. */
  protected abstract setup(): void;
  /** Avança a simulação em dt fixo; só chamado depois que a contagem regressiva zera. */
  protected abstract onTick(ctx: TickContext): void;
  /** Consome um input já normalizado; só chamado depois que a contagem regressiva zera. */
  protected abstract onInput(input: GameInput): void;
  /** Estado serializável lido pelo renderer. */
  abstract getState(): TState;
  /** 0..1 do objetivo cumprido. */
  abstract getProgress(): number;

  /** Hook opcional disparado no instante em que a contagem regressiva termina. */
  protected onArmed(): void {}

  start(): void {
    this.phase = 'arming';
    this.armingMsLeft = ARMING_MS;
    this.elapsed = 0;
    this.setup();
  }

  tick(ctx: TickContext): void {
    if (this.isOver()) return;

    if (this.phase === 'arming') {
      this.armingMsLeft = Math.max(0, this.armingMsLeft - ctx.dt);
      if (this.armingMsLeft <= 0) {
        this.phase = 'running';
        this.onArmed();
      }
      return;
    }

    this.elapsed += ctx.dt;
    this.onTick({ dt: ctx.dt, elapsed: this.elapsed });
  }

  handleInput(input: GameInput): void {
    if (this.phase !== 'running') return;
    this.onInput(input);
  }

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

  isOver(): boolean {
    return this.phase === 'blocked' || this.phase === 'breached';
  }

  snapshot(): Snapshot<TState> {
    return {
      phase: this.phase,
      progress: this.getProgress(),
      integrity: this.integrity,
      elapsed: this.elapsed,
      armingMsLeft: this.armingMsLeft,
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
