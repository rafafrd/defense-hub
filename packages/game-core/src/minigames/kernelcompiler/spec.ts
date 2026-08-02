import type { MinigameConfig } from '../../engine/types.js';
import { PendingController } from '../pending.js';

/** K3RN3LC0MP1L3R — typing defense. Regras a implementar (GDD). */
export const KERNELCOMPILER_SPEC = [
  'Renderiza linhas de código corrompido que o jogador precisa digitar.',
  'Typo pinta o caractere de vermelho e trava a digitação.',
  'O erro só sai com Backspace — nenhum outro input avança enquanto houver erro.',
  'Enter submete a linha; a vitória vem ao zerar o contador de linhas.',
];

export const createKernelCompiler = (config: MinigameConfig): PendingController =>
  new PendingController(config, {
    id: 'kernelcompiler', label: 'K3RN3LC0MP1L3R', renderer: 'dom', spec: KERNELCOMPILER_SPEC,
  });
