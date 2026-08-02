import type { MinigameConfig } from '../../engine/types.js';
import { PendingController } from '../pending.js';

/** TOKENINE — reconstrução visual. Regras a implementar (GDD). */
export const TOKENINE_SPEC = [
  'Um Token geométrico alvo aparece no topo e peças avulsas embaixo.',
  'O jogador seleciona as peças que somadas reproduzem exatamente o Token.',
  'Peça clicada não pode ser desmarcada.',
  'Montagem errada ou tempo esgotado = tentativa falha.',
];

export const createTokenine = (config: MinigameConfig): PendingController =>
  new PendingController(config, {
    id: 'tokenine', label: 'TOKENINE', renderer: 'canvas', spec: TOKENINE_SPEC,
  });
