import type { MinigameConfig } from '../../engine/types.js';
import { PendingController } from '../pending.js';

/** memDEALLOCATER — desvio vertical. Regras a implementar (GDD). */
export const MEMDEALLOCATER_SPEC = [
  'Bloco de memória desce verticalmente; cada linha tem áreas corrompidas e seguras.',
  'Input: Esquerda, Direita ou Espaço quando os dois lados estão seguros.',
  'Acerto enche a barra superior de sucesso; erro derruba a barra drasticamente.',
  'A velocidade de descida escala com o progresso da linha atual.',
];

export const createMemDeallocater = (config: MinigameConfig): PendingController =>
  new PendingController(config, {
    id: 'memdeallocater', label: 'memDEALLOCATER', renderer: 'canvas', spec: MEMDEALLOCATER_SPEC,
  });
