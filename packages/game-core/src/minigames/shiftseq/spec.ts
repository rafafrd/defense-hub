import type { MinigameConfig } from '../../engine/types.js';
import { PendingController } from '../pending.js';

/** shiftSEQ — grid combat e gestão de recurso. Regras a implementar (GDD). */
export const SHIFTSEQ_SPEC = [
  'Avatar move em WASD por uma grade com Home Node e nós infectados.',
  'Nós infectados disparam ataques ao Home Node; impacto reduz a saúde da conexão.',
  'Combate: pisar no nó infectado e martelar Espaço consome bateria e destrói a ameaça.',
  'Active Recharge: no Home Node, apertar Espaço no instante em que o anel pulsante alinha com a borda.',
];

export const createShiftSeq = (config: MinigameConfig): PendingController =>
  new PendingController(config, {
    id: 'shiftseq', label: 'shiftSEQ', renderer: 'canvas', spec: SHIFTSEQ_SPEC,
  });
