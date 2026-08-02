import type { MinigameController } from './engine/MinigameController.js';
import type { DifficultyParams, MinigameConfig, MinigameId, RendererKind } from './engine/types.js';
import { ZonewallController } from './minigames/zonewall/ZonewallController.js';
import { MemDefragerController } from './minigames/memdefrager/MemDefragerController.js';
import { NodeHexerController } from './minigames/nodehexer/NodeHexerController.js';
import { createKernelCompiler } from './minigames/kernelcompiler/spec.js';
import { createMemDeallocater } from './minigames/memdeallocater/spec.js';
import { createShiftSeq } from './minigames/shiftseq/spec.js';
import { createStackPusher } from './minigames/stackpusher/spec.js';
import { createTokenine } from './minigames/tokenine/spec.js';

export interface MinigameEntry {
  id: MinigameId;
  label: string;
  /** Origem da mecânica, usada como agrupamento no menu. */
  group: 'WTTG2' | 'WTTG3';
  renderer: RendererKind;
  /** Uma linha explicando o que o jogador precisa fazer. */
  brief: string;
  /** Teclas/ações relevantes, mostradas no card e no HUD. */
  controls: string;
  implemented: boolean;
  defaults: DifficultyParams;
  create: (config: MinigameConfig) => MinigameController<unknown>;
}

/**
 * Fonte única de verdade do hub. O menu, o modo Sobrevivência e o serviço de
 * dificuldade da API leem daqui — nenhum outro lugar mantém lista de minigames.
 */
export const MINIGAMES: readonly MinigameEntry[] = [
  {
    id: 'zonewall',
    label: 'ZONEWALL',
    group: 'WTTG2',
    renderer: 'canvas',
    brief: 'Acione dentro de cada zona segura enquanto a barra varre a trilha.',
    controls: 'Clique ou Espaço',
    implemented: true,
    defaults: { safeZones: 4, hostileZones: 2, safeWidth: 0.045, hostileWidth: 0.06, speed: 0.35, missPenalty: 0.5 },
    create: (config) => new ZonewallController(config),
  },
  {
    id: 'memdefrager',
    label: 'memD3FR4G3R',
    group: 'WTTG2',
    renderer: 'dom',
    brief: 'Memorize a sequência de endereços e repita na mesma ordem.',
    controls: 'Clique',
    implemented: true,
    defaults: { columns: 4, rows: 4, sequenceLength: 5, flashMs: 520, attempts: 3, missPenalty: 0.34 },
    create: (config) => new MemDefragerController(config),
  },
  {
    id: 'nodehexer',
    label: 'nodeH3X3R',
    group: 'WTTG2',
    renderer: 'dom',
    brief: 'Ligue todos os nós alvo alternando Alfa e Beta a cada passo.',
    controls: 'Clique',
    implemented: true,
    defaults: { width: 5, height: 5, targets: 4, timeLimitMs: 45000, breakPenalty: 0.25 },
    create: (config) => new NodeHexerController(config),
  },
  {
    id: 'kernelcompiler',
    label: 'K3RN3LC0MP1L3R',
    group: 'WTTG3',
    renderer: 'dom',
    brief: 'Digite as linhas corrompidas; typo só sai no Backspace.',
    controls: 'Teclado, Backspace, Enter',
    implemented: false,
    defaults: { lines: 4, lineLength: 28 },
    create: createKernelCompiler,
  },
  {
    id: 'memdeallocater',
    label: 'memDEALLOCATER',
    group: 'WTTG3',
    renderer: 'canvas',
    brief: 'Desvie para o lado seguro de cada linha que desce.',
    controls: 'Esquerda, Direita, Espaço',
    implemented: false,
    defaults: { rows: 20, fallMs: 700 },
    create: createMemDeallocater,
  },
  {
    id: 'shiftseq',
    label: 'shiftSEQ',
    group: 'WTTG3',
    renderer: 'canvas',
    brief: 'Destrua os nós infectados e recarregue a bateria no timing certo.',
    controls: 'WASD, Espaço',
    implemented: false,
    defaults: { gridSize: 7, infectedNodes: 3, battery: 100 },
    create: createShiftSeq,
  },
  {
    id: 'stackpusher',
    label: 'stackPUSHER',
    group: 'WTTG3',
    renderer: 'dom',
    brief: 'Empurre cada Stack até o nó Delete sem tocar nas Caveiras.',
    controls: 'Clique',
    implemented: false,
    defaults: { gridSize: 8, stacks: 3, skulls: 5 },
    create: createStackPusher,
  },
  {
    id: 'tokenine',
    label: 'TOKENINE',
    group: 'WTTG3',
    renderer: 'canvas',
    brief: 'Selecione as peças que reconstroem o Token antes do tempo acabar.',
    controls: 'Clique',
    implemented: false,
    defaults: { pieces: 9, timeLimitMs: 12000 },
    create: createTokenine,
  },
] as const;

export const getMinigame = (id: MinigameId): MinigameEntry => {
  const entry = MINIGAMES.find((m) => m.id === id);
  if (!entry) throw new Error(`Minigame desconhecido: ${id}`);
  return entry;
};

export const playableMinigames = (): MinigameEntry[] => MINIGAMES.filter((m) => m.implemented);

/**
 * Constrói o controller já com a dificuldade resolvida: os defaults do registry
 * são a base e o override (vindo da API, por perfil) tem precedência.
 */
export const createMinigame = (
  id: MinigameId,
  seed: number,
  override: DifficultyParams = {},
): MinigameController<unknown> => {
  const entry = getMinigame(id);
  return entry.create({ seed, difficulty: { ...entry.defaults, ...override } });
};
