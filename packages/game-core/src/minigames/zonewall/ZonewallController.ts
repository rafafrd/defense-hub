import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';

export type ZoneKind = 'safe' | 'hostile';

export interface Zone {
  id: string;
  /** Posição normalizada 0..1 na trilha. */
  start: number;
  end: number;
  kind: ZoneKind;
  hit: boolean;
}

export interface ZonewallState {
  /** Posição atual da barra móvel, 0..1. */
  bar: number;
  zones: Zone[];
  /** Índice da próxima zona segura a ser bloqueada. */
  nextTargetIndex: number;
  /** Frames restantes de destaque após um acerto (usado pelo renderer). */
  flash: number;
}

/**
 * Zonewall — skill check de precisão.
 * A barra varre a trilha uma única vez. O jogador precisa acionar dentro de cada
 * zona verde na ordem; acionar dentro de uma zona vermelha derruba a conexão na
 * hora, e deixar uma zona verde passar conta como falha de bloqueio.
 */
export class ZonewallController extends MinigameController<ZonewallState> {
  readonly id: MinigameId = 'zonewall';
  readonly renderer: RendererKind = 'canvas';
  readonly label = 'ZONEWALL';

  private bar = 0;
  private zones: Zone[] = [];
  private nextTargetIndex = 0;
  private flash = 0;

  start(): void {
    const safeCount = Math.round(this.num('safeZones', 4));
    const hostileCount = Math.round(this.num('hostileZones', 2));
    const safeWidth = this.num('safeWidth', 0.045);
    const hostileWidth = this.num('hostileWidth', 0.06);

    const total = safeCount + hostileCount;
    const slot = 1 / (total + 1);
    const kinds: ZoneKind[] = [
      ...Array<ZoneKind>(safeCount).fill('safe'),
      ...Array<ZoneKind>(hostileCount).fill('hostile'),
    ];

    this.zones = this.rng
      .shuffle(kinds)
      .map((kind, index) => {
        const width = kind === 'safe' ? safeWidth : hostileWidth;
        const center = slot * (index + 1) + this.rng.float(-slot * 0.25, slot * 0.25);
        return {
          id: `z${index}`,
          kind,
          start: Math.max(0.02, center - width / 2),
          end: Math.min(0.98, center + width / 2),
          hit: false,
        };
      })
      .sort((a, b) => a.start - b.start);

    this.nextTargetIndex = this.zones.findIndex((z) => z.kind === 'safe');
    this.bar = 0;
    this.markRunning();
  }

  tick(ctx: TickContext): void {
    if (this.isOver()) return;
    this.elapsed = ctx.elapsed;
    this.flash = Math.max(0, this.flash - ctx.dt);

    const speed = this.num('speed', 0.35) / 1000; // fração da trilha por ms
    this.bar += speed * ctx.dt;

    const target = this.zones[this.nextTargetIndex];
    if (target && this.bar > target.end) {
      // A barra passou por uma zona verde sem bloqueio: falha de contenção.
      this.damage(this.num('missPenalty', 0.5), 'Zona segura ultrapassada sem bloqueio');
      this.advanceTarget();
    }

    if (this.bar >= 1) {
      const pending = this.zones.some((z) => z.kind === 'safe' && !z.hit);
      if (pending) this.resolve('breached', 'Varredura encerrada com zonas abertas');
      else this.resolve('blocked');
    }
  }

  handleInput(input: GameInput): void {
    if (this.isOver()) return;
    const isAction = input.type === 'pointer' || input.code === 'Space' || input.code === 'Enter';
    if (!isAction) return;

    const zone = this.zones.find((z) => this.bar >= z.start && this.bar <= z.end);

    if (!zone) {
      this.damage(this.num('missPenalty', 0.5), 'Acionamento fora de zona');
      return;
    }
    if (zone.kind === 'hostile') {
      this.resolve('breached', 'Acionamento em zona hostil');
      return;
    }
    if (zone.hit) return;

    zone.hit = true;
    this.flash = 180;
    // Quanto mais perto do centro da zona, maior a pontuação.
    const center = (zone.start + zone.end) / 2;
    const accuracy = 1 - Math.abs(this.bar - center) / ((zone.end - zone.start) / 2);
    this.reward(100 + Math.round(accuracy * 100));
    this.advanceTarget();

    if (this.zones.every((z) => z.kind !== 'safe' || z.hit)) {
      this.resolve('blocked'); // Insta Hack Block
    }
  }

  getState(): ZonewallState {
    return { bar: this.bar, zones: this.zones, nextTargetIndex: this.nextTargetIndex, flash: this.flash };
  }

  getProgress(): number {
    const safe = this.zones.filter((z) => z.kind === 'safe');
    if (safe.length === 0) return 0;
    return safe.filter((z) => z.hit).length / safe.length;
  }

  private advanceTarget(): void {
    const next = this.zones.findIndex((z, i) => i > this.nextTargetIndex && z.kind === 'safe' && !z.hit);
    this.nextTargetIndex = next;
  }
}
