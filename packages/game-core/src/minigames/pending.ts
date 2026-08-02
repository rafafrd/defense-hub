import { MinigameController } from '../engine/MinigameController.js';
import type {
  GameInput, MinigameConfig, MinigameId, RendererKind, TickContext,
} from '../engine/types.js';

export interface PendingState {
  /** Regras do GDD que este controller ainda precisa implementar. */
  spec: string[];
}

/**
 * Placeholder tipado para os minigames ainda não implementados. Mantém o
 * contrato do registry válido (o menu já lista o card, marcado como pendente)
 * sem fingir mecânica: a partida não inicia.
 *
 * Ao implementar um minigame, troque a entrada no registry pelo controller real
 * e apague o arquivo de spec correspondente.
 */
export class PendingController extends MinigameController<PendingState> {
  readonly id: MinigameId;
  readonly renderer: RendererKind;
  readonly label: string;
  private readonly spec: string[];

  constructor(
    config: MinigameConfig,
    meta: { id: MinigameId; label: string; renderer: RendererKind; spec: string[] },
  ) {
    super(config);
    this.id = meta.id;
    this.label = meta.label;
    this.renderer = meta.renderer;
    this.spec = meta.spec;
  }

  start(): void {
    this.markRunning();
  }

  tick(ctx: TickContext): void {
    this.elapsed = ctx.elapsed;
  }

  handleInput(_input: GameInput): void {
    /* sem mecânica implementada */
  }

  getState(): PendingState {
    return { spec: this.spec };
  }

  getProgress(): number {
    return 0;
  }
}
