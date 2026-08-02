import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DifficultyService } from '../services/difficultyService.js';

const handleSchema = z.object({ handle: z.string().min(2).max(24) });
const paramsSchema = z.object({ id: z.string().uuid() });
const difficultySchema = z.object({
  minigameId: z.string().min(1),
  params: z.record(z.union([z.number(), z.boolean(), z.string()])),
});

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  const difficulty = new DifficultyService(app.prisma);

  // Identidade leve: um handle basta para separar histórico e dificuldade.
  app.post('/profiles', async (request, reply) => {
    const { handle } = handleSchema.parse(request.body);
    const profile = await app.prisma.profile.upsert({
      where: { handle },
      create: { handle },
      update: {},
      select: { id: true, handle: true },
    });
    return reply.code(200).send(profile);
  });

  app.get('/profiles/:id/difficulty', async (request) => {
    const { id } = paramsSchema.parse(request.params);
    return difficulty.forProfile(id);
  });

  app.put('/profiles/:id/difficulty', async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const body = difficultySchema.parse(request.body);
    return difficulty.upsert(id, body.minigameId, body.params);
  });
}
