import type { MinigameController } from './MinigameController.js';
import type { TickContext } from './types.js';

export interface LoopOptions {
  /** Timestep fixo em ms. 1000/120 dá resolução suficiente para skill checks. */
  stepMs?: number;
  now?: () => number;
  schedule?: (cb: (t: number) => void) => number;
  cancel?: (handle: number) => void;
  onFrame?: (ctx: TickContext) => void;
  onResolved?: () => void;
}

/**
 * Loop com acumulador de timestep fixo: a simulação anda em passos constantes
 * independentemente do framerate, então a janela de acerto do Zonewall é a mesma
 * num monitor de 60Hz e num de 144Hz. As dependências de tempo são injetáveis
 * para o loop rodar em teste sem requestAnimationFrame.
 */
export class GameLoop {
  private handle: number | null = null;
  private accumulator = 0;
  private lastTime = 0;
  private elapsed = 0;

  private readonly stepMs: number;
  private readonly now: () => number;
  private readonly schedule: (cb: (t: number) => void) => number;
  private readonly cancel: (handle: number) => void;

  constructor(
    private readonly controller: MinigameController<unknown>,
    private readonly options: LoopOptions = {},
  ) {
    this.stepMs = options.stepMs ?? 1000 / 120;
    this.now = options.now ?? (() => performance.now());
    this.schedule = options.schedule ?? ((cb) => requestAnimationFrame(cb));
    this.cancel = options.cancel ?? ((h) => cancelAnimationFrame(h));
  }

  start(): void {
    if (this.handle !== null) return;
    this.controller.start();
    this.lastTime = this.now();
    this.handle = this.schedule(this.frame);
  }

  stop(): void {
    if (this.handle === null) return;
    this.cancel(this.handle);
    this.handle = null;
  }

  /** Avança a simulação manualmente — usado nos testes de regra. */
  advance(ms: number): void {
    let remaining = ms;
    while (remaining >= this.stepMs && !this.controller.isOver()) {
      this.elapsed += this.stepMs;
      this.controller.tick({ dt: this.stepMs, elapsed: this.elapsed });
      remaining -= this.stepMs;
    }
  }

  private frame = (): void => {
    if (this.handle === null) return;
    const current = this.now();
    // Clamp evita "spiral of death" quando a aba volta do background.
    this.accumulator += Math.min(current - this.lastTime, 250);
    this.lastTime = current;

    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      this.elapsed += this.stepMs;
      const ctx: TickContext = { dt: this.stepMs, elapsed: this.elapsed };
      this.controller.tick(ctx);
      this.options.onFrame?.(ctx);
      if (this.controller.isOver()) {
        this.stop();
        this.options.onResolved?.();
        return;
      }
    }
    this.handle = this.schedule(this.frame);
  };
}
