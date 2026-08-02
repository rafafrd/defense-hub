import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { env } from './env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { healthRoutes } from './routes/health.js';
import { profileRoutes } from './routes/profiles.js';
import { runRoutes } from './routes/runs.js';

const app = Fastify({ logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' } });

await app.register(cors, { origin: env.NODE_ENV === 'production' ? false : true });
await app.register(prismaPlugin);
await app.register(healthRoutes);
await app.register(profileRoutes);
await app.register(runRoutes);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: 'payload inválido', issues: error.issues });
  }
  app.log.error(error);
  return reply.code(500).send({ error: 'falha interna' });
});

const shutdown = async (signal: string): Promise<void> => {
  app.log.info(`${signal} recebido, encerrando`);
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
