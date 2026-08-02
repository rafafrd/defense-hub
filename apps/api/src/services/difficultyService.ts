import type { PrismaClient } from '@prisma/client';

export type DifficultyParams = Record<string, number | boolean | string>;

/**
 * Resolve os overrides de dificuldade de um perfil.
 * Os defaults de cada minigame ficam no registry do game-core; aqui só existe o
 * delta persistido, mais o ajuste adaptativo calculado sobre as últimas runs.
 */
export class DifficultyService {
  constructor(private readonly prisma: PrismaClient) {}

  async forProfile(profileId: string): Promise<Record<string, DifficultyParams>> {
    const settings = await this.prisma.difficultySetting.findMany({ where: { profileId } });
    return Object.fromEntries(
      settings.map((s) => [s.minigameId, s.params as DifficultyParams]),
    );
  }

  async upsert(
    profileId: string,
    minigameId: string,
    params: DifficultyParams,
  ): Promise<DifficultyParams> {
    const row = await this.prisma.difficultySetting.upsert({
      where: { profileId_minigameId: { profileId, minigameId } },
      create: { profileId, minigameId, params },
      update: { params },
    });
    return row.params as DifficultyParams;
  }

  /**
   * Ajuste adaptativo: três bloqueios seguidos apertam o desafio, três invasões
   * seguidas afrouxam. Retorna o multiplicador a aplicar sobre os defaults.
   */
  async suggestedScale(profileId: string, minigameId: string): Promise<number> {
    const recent = await this.prisma.run.findMany({
      where: { profileId, minigameId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { outcome: true },
    });
    if (recent.length < 3) return 1;
    if (recent.every((r) => r.outcome === 'blocked')) return 1.15;
    if (recent.every((r) => r.outcome === 'breached')) return 0.9;
    return 1;
  }
}
