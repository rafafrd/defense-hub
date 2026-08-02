import type { MinigameConfig } from '../../engine/types.js';
import { PendingController } from '../pending.js';

/** stackPUSHER — puzzle físico de blocos. Regras a implementar (GDD). */
export const STACKPUSHER_SPEC = [
  'Objetivo: levar todos os nós Stack até o nó Delete.',
  'Stacks não se movem sozinhos: primeiro posiciona-se o Pusher, depois clica-se no Stack.',
  'O Stack só pode ser movido dentro do raio 3x3 em volta do Pusher.',
  'Pusher ou Stack sobre uma Caveira = derrota imediata.',
];

export const createStackPusher = (config: MinigameConfig): PendingController =>
  new PendingController(config, {
    id: 'stackpusher', label: 'stackPUSHER', renderer: 'dom', spec: STACKPUSHER_SPEC,
  });
