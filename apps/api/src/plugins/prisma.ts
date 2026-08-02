import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Um único PrismaClient por processo, fechado no shutdown do Fastify.
 * Envolto em fastify-plugin para escapar do encapsulamento: sem isso, a
 * decoration fica presa neste contexto filho e app.prisma some nas rotas.
 */
export const prismaPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
