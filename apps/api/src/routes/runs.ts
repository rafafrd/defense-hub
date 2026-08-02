import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().uuid() });

const runSchema = z.object({
  minigameId: z.string().min(1),
  mode: z.enum(['solo', 'survival']),
  outcome: z.enum(['blocked', 'breached']),
  score: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  seed: z.number().int(),
  reason: z.string().max(200).optional(),
});

export async function runRoutes(app: FastifyInstance): Promise<void> {
  app.post('/profiles/:id/runs', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = runSchema.parse(request.body);

    const run = await app.prisma.run.create({
      data: { ...body, profileId: id, seed: BigInt(body.seed) },
      select: { id: true },
    });
    return reply.code(201).send(run);
  });

  app.get('/profiles/:id/runs', async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const runs = await app.prisma.run.findMany({
      where: { profileId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    // BigInt não serializa em JSON: a seed volta como número.
    return runs.map((run) => ({ ...run, seed: Number(run.seed) }));
  });

  app.get('/leaderboard/:minigameId', async (request) => {
    const { minigameId } = z.object({ minigameId: z.string() }).parse(request.params);
    const rows = await app.prisma.run.findMany({
      where: { minigameId, outcome: 'blocked' },
      orderBy: [{ score: 'desc' }, { durationMs: 'asc' }],
      take: 10,
      select: { score: true, durationMs: true, createdAt: true, profile: { select: { handle: true } } },
    });
    return rows.map((row) => ({
      handle: row.profile.handle,
      score: row.score,
      durationMs: row.durationMs,
      createdAt: row.createdAt,
    }));
  });
}
