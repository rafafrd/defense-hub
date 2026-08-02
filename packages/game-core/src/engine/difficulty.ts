import type { DifficultyParams, MinigameId } from './types.js';
import { getMinigame } from '../registry.js';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Rótulo de cada nível, usado no seletor do menu e no ArmingOverlay.
 * Nível 3 é o jogo "de verdade"; 1 e 2 são treino, 4 e 5 apertam de propósito.
 */
export const LEVEL_NAMES: Record<DifficultyLevel, string> = {
  1: 'PROBE',
  2: 'SCAN',
  3: 'INTRUSION',
  4: 'BREACH',
  5: '1337',
};

/**
 * Cada minigame escreve os 5 níveis à mão — a escala não é linear (a curva de
 * 3 para 5 é bem mais íngreme que a de 1 para 3), então não faz sentido derivar
 * os níveis de um único default por multiplicador.
 */
export type DifficultyTable = Record<DifficultyLevel, DifficultyParams>;

/**
 * Funde a tabela de nível do minigame (registry) com o override de perfil
 * (vindo da API). O override tem precedência: é o ajuste fino de um jogador
 * específico sobre o nível que ele escolheu.
 */
export function resolveDifficulty(
  id: MinigameId,
  level: DifficultyLevel,
  override: DifficultyParams = {},
): DifficultyParams {
  const entry = getMinigame(id);
  return { ...entry.levels[level], ...override };
}
