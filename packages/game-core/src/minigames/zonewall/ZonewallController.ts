import { MinigameController } from '../../engine/MinigameController.js';
import type {
  GameInput, MinigameId, Outcome, RendererKind, RunResult, TickContext,
} from '../../engine/types.js';

export type RowOutcome = 'pending' | 'hit' | 'miss';

export interface ZoneRow {
  id: string;
  /** Zona-alvo desta linha, normalizada 0..1 na trilha própria da linha. */
  zoneStart: number;
  zoneEnd: number;
  outcome: RowOutcome;
  /** Sentido atual da varredura: 1 avança, -1 recua. Só inverte no nível 5. */
  direction: 1 | -1;
  /** Ponto 0..1 em que a barra inverte de direção uma única vez; ausente fora do nível 5. */
  reverseAt?: number;
  reversed: boolean;
}

export interface ZonewallState {
  rows: ZoneRow[];
  /** Índice da linha atualmente varrida; linhas antes dela já foram resolvidas. */
  activeRowIndex: number;
  /** Posição da barra na linha ativa, 0..1. */
  bar: number;
  hits: number;
  misses: number;
  hitsNeeded: number;
  /** Última linha resolvida, usada pelo renderer para o pulso de acerto/erro. */
  lastResolvedIndex: number | null;
  /** ms restantes de destaque de acerto. */
  flash: number;
  /** ms restantes de destaque de erro (pisca vermelho). */
  errorFlash: number;
}

/**
 * Zonewall — skill check de precisão, replicando a mecânica real do WTTG2:
 * a tela empilha várias linhas; a barra varre só a linha ativa (começando do
 * topo) e o jogador aciona quando ela cruza a zona-alvo daquela linha.
 * Acertando ou errando, o jogo sempre desce para a próxima linha — não há
 * repetição. Acumular os acertos exigidos bloqueia a hack na hora (Insta Hack
 * Block); acumular erros o bastante para tornar isso matematicamente
 * impossível já resolve como invasão, sem esperar a última linha.
 */
export class ZonewallController extends MinigameController<ZonewallState> {
  readonly id: MinigameId = 'zonewall';
  readonly renderer: RendererKind = 'canvas';
  readonly label = 'ZONEWALL';

  private rows: ZoneRow[] = [];
  private activeRowIndex = 0;
  private bar = 0;
  private hits = 0;
  private misses = 0;
  private hitsNeeded = 1;
  private maxMisses = 1;
  private speed = 0.65;
  private accelPerRow = 0;
  private lastResolvedIndex: number | null = null;
  private flash = 0;
  private errorFlash = 0;
  private chainTo?: MinigameId;

  protected setup(): void {
    const rowCount = Math.max(1, Math.round(this.num('rows', 5)));
    const zoneWidth = this.num('zoneWidth', 0.07);
    const half = zoneWidth / 2;
    const reverseOnce = this.flag('reverseOnce');

    this.hitsNeeded = Math.max(1, Math.round(this.num('hitsNeeded', 4)));
    this.speed = this.num('speed', 0.65);
    this.accelPerRow = this.num('accelPerRow', 0);
    this.maxMisses = Math.max(1, rowCount - this.hitsNeeded + 1);

    this.rows = Array.from({ length: rowCount }, (_, i): ZoneRow => {
      const center = this.rng.float(half, 1 - half);
      return {
        id: `row${i}`,
        zoneStart: center - half,
        zoneEnd: center + half,
        outcome: 'pending',
        direction: 1,
        reverseAt: reverseOnce ? this.rng.float(0.25, 0.75) : undefined,
        reversed: false,
      };
    });

    this.activeRowIndex = 0;
    this.bar = 0;
    this.hits = 0;
    this.misses = 0;
    this.lastResolvedIndex = null;
    this.flash = 0;
    this.errorFlash = 0;
    this.chainTo = undefined;
  }

  protected onTick(ctx: TickContext): void {
    this.flash = Math.max(0, this.flash - ctx.dt);
    this.errorFlash = Math.max(0, this.errorFlash - ctx.dt);

    const row = this.rows[this.activeRowIndex];
    if (!row) return;

    const effectiveSpeed = this.speed * (1 + this.accelPerRow * this.bar);
    this.bar += (row.direction * effectiveSpeed * ctx.dt) / 1000;

    if (row.reverseAt !== undefined && !row.reversed) {
      const crossed = row.direction > 0 ? this.bar >= row.reverseAt : this.bar <= row.reverseAt;
      if (crossed) {
        row.direction = row.direction > 0 ? -1 : 1;
        row.reversed = true;
      }
    }

    if (this.bar >= 1 || this.bar <= 0) {
      this.bar = Math.min(1, Math.max(0, this.bar));
      const rowIndex = this.activeRowIndex;
      this.registerMiss(row, rowIndex, 'Linha varrida sem acionamento');
      if (!this.isOver()) this.advanceRow();
    }
  }

  protected onInput(input: GameInput): void {
    const isAction = input.type === 'pointer' || input.code === 'Space' || input.code === 'Enter';
    if (!isAction) return;

    const rowIndex = this.activeRowIndex;
    const row = this.rows[rowIndex];
    if (!row) return;

    const inZone = this.bar >= row.zoneStart && this.bar <= row.zoneEnd;
    if (inZone) this.registerHit(row, rowIndex);
    else this.registerMiss(row, rowIndex, 'Acionamento fora da zona-alvo');

    if (!this.isOver()) this.advanceRow();
  }

  getState(): ZonewallState {
    return {
      rows: this.rows,
      activeRowIndex: this.activeRowIndex,
      bar: this.bar,
      hits: this.hits,
      misses: this.misses,
      hitsNeeded: this.hitsNeeded,
      lastResolvedIndex: this.lastResolvedIndex,
      flash: this.flash,
      errorFlash: this.errorFlash,
    };
  }

  getProgress(): number {
    return this.hitsNeeded === 0 ? 0 : Math.min(1, this.hits / this.hitsNeeded);
  }

  result(): RunResult {
    const base = super.result();
    return this.chainTo ? { ...base, chainTo: this.chainTo } : base;
  }

  /** Sorteia o encadeamento a partir do chainPool assim que uma invasão é decidida. */
  protected resolve(outcome: Outcome, reason?: string): void {
    if (this.isOver()) return;
    super.resolve(outcome, reason);
    if (outcome === 'breached') {
      const pool = this.config.chainPool;
      if (pool && pool.length > 0) this.chainTo = this.rng.pick(pool);
    }
  }

  private registerHit(row: ZoneRow, rowIndex: number): void {
    row.outcome = 'hit';
    this.hits += 1;
    this.lastResolvedIndex = rowIndex;
    this.flash = 180;

    const half = (row.zoneEnd - row.zoneStart) / 2;
    const center = row.zoneStart + half;
    const accuracy = half > 0 ? 1 - Math.abs(this.bar - center) / half : 1;
    this.reward(100 + Math.round(Math.max(0, accuracy) * 100));

    if (this.hits >= this.hitsNeeded) this.resolve('blocked');
  }

  private registerMiss(row: ZoneRow, rowIndex: number, reason: string): void {
    row.outcome = 'miss';
    this.misses += 1;
    this.lastResolvedIndex = rowIndex;
    this.errorFlash = 260;
    this.damage(1 / this.maxMisses, reason);
  }

  private advanceRow(): void {
    this.activeRowIndex += 1;
    this.bar = 0;
    if (this.activeRowIndex >= this.rows.length && !this.isOver()) {
      this.resolve(this.hits >= this.hitsNeeded ? 'blocked' : 'breached');
    }
  }

  private flag(key: string): boolean {
    return this.config.difficulty[key] === true;
  }
}
