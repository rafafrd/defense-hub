import type { MinigameController } from './engine/MinigameController.js';
import type { DifficultyParams, MinigameConfig, MinigameId, RendererKind } from './engine/types.js';
import type { DifficultyLevel, DifficultyTable } from './engine/difficulty.js';
import { resolveDifficulty } from './engine/difficulty.js';
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
  /** Tabela dos 5 níveis, escrita à mão — a escala não é linear. */
  levels: DifficultyTable;
  /** Uma frase: o que vence a rotina. */
  objective: string;
  /** 3 a 5 passos curtos, imperativos. */
  howTo: string[];
  /** Como se perde — a parte que mais falta explicar hoje. */
  failsWhen: string[];
  /** O que cada cor/forma quer dizer na tela. */
  legend: Array<{ symbol: string; meaning: string }>;
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
    brief: 'Acione no instante em que a barra cruza a zona-alvo de cada linha, em sequência.',
    controls: 'Clique ou Espaço',
    implemented: true,
    levels: {
      1: { rows: 3, hitsNeeded: 2, zoneWidth: 0.16, speed: 0.30 },
      2: { rows: 4, hitsNeeded: 3, zoneWidth: 0.11, speed: 0.45 },
      3: { rows: 5, hitsNeeded: 4, zoneWidth: 0.070, speed: 0.65 },
      4: { rows: 7, hitsNeeded: 6, zoneWidth: 0.045, speed: 0.85, accelPerRow: 0.15 },
      5: { rows: 9, hitsNeeded: 9, zoneWidth: 0.028, speed: 1.10, reverseOnce: true },
    },
    objective: 'Acerte o número mínimo de linhas antes que os erros tornem o bloqueio impossível.',
    howTo: [
      'A linha ativa (destacada) fica no topo da pilha; as demais aparecem esmaecidas.',
      'Clique ou aperte Espaço quando a barra estiver sobre a zona clara da linha ativa.',
      'Acertando ou errando, o jogo sempre desce para a próxima linha — não há repetição.',
      'Alcance o número de acertos exigido para bloquear a hack antes de esgotar as linhas.',
    ],
    failsWhen: [
      'O total de erros torna matematicamente impossível atingir os acertos necessários.',
      'No nível 1337, qualquer erro já encerra o bloqueio — acerto perfeito é obrigatório.',
    ],
    legend: [
      { symbol: '▮ ciano', meaning: 'zona-alvo da linha ativa' },
      { symbol: '│ laranja', meaning: 'barra em varredura' },
      { symbol: '✓', meaning: 'linha bloqueada' },
      { symbol: '✗', meaning: 'linha perdida' },
    ],
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
    levels: {
      1: { columns: 3, rows: 3, sequenceLength: 3, flashMs: 900, attempts: 5, missPenalty: 0.15 },
      2: { columns: 4, rows: 3, sequenceLength: 4, flashMs: 700, attempts: 4, missPenalty: 0.22 },
      3: { columns: 4, rows: 4, sequenceLength: 5, flashMs: 520, attempts: 3, missPenalty: 0.34 },
      4: { columns: 5, rows: 4, sequenceLength: 7, flashMs: 380, attempts: 2, missPenalty: 0.5 },
      5: { columns: 6, rows: 5, sequenceLength: 9, flashMs: 260, attempts: 1, missPenalty: 0.75 },
    },
    objective: 'Repita a sequência de endereços exibida, na mesma ordem, antes de esgotar as tentativas.',
    howTo: [
      'Memorize a ordem das células que piscam na grade.',
      'Espere a fase de leitura terminar.',
      'Clique nas células na mesma ordem em que piscaram.',
    ],
    failsWhen: [
      'Você clica uma célula fora de ordem e esgota todas as tentativas.',
    ],
    legend: [
      { symbol: '▮ âmbar', meaning: 'célula piscando — memorize' },
      { symbol: '▮ verde', meaning: 'célula já confirmada' },
    ],
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
    levels: {
      1: { width: 4, height: 4, targets: 2, timeLimitMs: 0, breakPenalty: 0.12 },
      2: { width: 5, height: 4, targets: 3, timeLimitMs: 60_000, breakPenalty: 0.18 },
      3: { width: 5, height: 5, targets: 4, timeLimitMs: 45_000, breakPenalty: 0.25 },
      4: { width: 6, height: 6, targets: 6, timeLimitMs: 30_000, breakPenalty: 0.35 },
      5: { width: 7, height: 7, targets: 9, timeLimitMs: 20_000, breakPenalty: 0.5 },
    },
    objective: 'Trace um caminho ligando todos os nós alvo, alternando Alfa e Beta a cada passo.',
    howTo: [
      'Comece no nó inicial (destacado).',
      'Clique num nó vizinho de tipo diferente do atual — Alfa liga só com Beta e vice-versa.',
      'Colete todos os nós marcados como alvo.',
      'Clique no nó anterior do caminho para desfazer um passo sem penalidade.',
    ],
    failsWhen: [
      'Você liga dois nós do mesmo tipo — a conexão quebra e o caminho volta ao início.',
      'Você tenta pular para um nó não adjacente.',
      'O tempo do traçado se esgota.',
    ],
    legend: [
      { symbol: '■ Alfa', meaning: 'nó quadrado' },
      { symbol: '● Beta', meaning: 'nó circular' },
      { symbol: '◈', meaning: 'nó alvo' },
    ],
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
    levels: {
      1: { lines: 2, lineLength: 16 },
      2: { lines: 3, lineLength: 22 },
      3: { lines: 4, lineLength: 28 },
      4: { lines: 6, lineLength: 38 },
      5: { lines: 9, lineLength: 52 },
    },
    objective: 'Digite corretamente todas as linhas de código corrompido antes de zerar o contador.',
    howTo: [
      'Leia a linha corrompida exibida.',
      'Digite os caracteres na ordem exata.',
      'Se errar, aperte Backspace até apagar o caractere errado.',
      'Aperte Enter para submeter a linha completa.',
    ],
    failsWhen: [
      'Você tenta avançar com um erro não corrigido na linha atual.',
    ],
    legend: [
      { symbol: 'vermelho', meaning: 'caractere digitado errado' },
    ],
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
    levels: {
      1: { rows: 12, fallMs: 1100 },
      2: { rows: 16, fallMs: 900 },
      3: { rows: 20, fallMs: 700 },
      4: { rows: 28, fallMs: 480 },
      5: { rows: 38, fallMs: 300 },
    },
    objective: 'Desvie para o lado seguro de cada linha que desce até o Home Node.',
    howTo: [
      'Observe a linha descendo com um lado seguro e um lado corrompido.',
      'Aperte Esquerda ou Direita para escolher o lado seguro antes que ela chegue embaixo.',
      'Aperte Espaço quando os dois lados estiverem seguros.',
    ],
    failsWhen: [
      'Você escolhe o lado corrompido.',
      'A barra de sucesso é derrubada por erros seguidos.',
    ],
    legend: [
      { symbol: '▮ verde', meaning: 'lado seguro da linha' },
      { symbol: '▮ vermelho', meaning: 'lado corrompido' },
    ],
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
    levels: {
      1: { gridSize: 5, infectedNodes: 2, battery: 160 },
      2: { gridSize: 6, infectedNodes: 2, battery: 130 },
      3: { gridSize: 7, infectedNodes: 3, battery: 100 },
      4: { gridSize: 8, infectedNodes: 5, battery: 70 },
      5: { gridSize: 9, infectedNodes: 8, battery: 45 },
    },
    objective: 'Destrua os nós infectados e proteja o Home Node sem esgotar a bateria.',
    howTo: [
      'Mova-se pela grade com WASD.',
      'Pise num nó infectado e martele Espaço para destruí-lo.',
      'Volte ao Home Node quando a bateria estiver baixa.',
      'No Home Node, aperte Espaço no instante em que o anel pulsante alinha com a borda para recarregar.',
    ],
    failsWhen: [
      'Os nós infectados destroem o Home Node antes de serem eliminados.',
      'A bateria chega a zero longe do Home Node.',
    ],
    legend: [
      { symbol: '◆ vermelho', meaning: 'nó infectado' },
      { symbol: '■ âmbar', meaning: 'Home Node' },
    ],
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
    levels: {
      1: { gridSize: 6, stacks: 2, skulls: 2 },
      2: { gridSize: 7, stacks: 2, skulls: 4 },
      3: { gridSize: 8, stacks: 3, skulls: 5 },
      4: { gridSize: 9, stacks: 4, skulls: 8 },
      5: { gridSize: 10, stacks: 5, skulls: 12 },
    },
    objective: 'Empurre todos os nós Stack até o nó Delete sem tocar nas caveiras.',
    howTo: [
      'Posicione o Pusher ao lado do Stack que quer mover.',
      'Clique no Stack para empurrá-lo na direção oposta ao Pusher.',
      'O Stack só se move dentro do raio 3x3 ao redor do Pusher.',
      'Repita até levar todos os Stacks ao nó Delete.',
    ],
    failsWhen: [
      'O Pusher ou um Stack para sobre uma Caveira.',
    ],
    legend: [
      { symbol: '▲', meaning: 'Pusher' },
      { symbol: '■', meaning: 'Stack' },
      { symbol: '☠', meaning: 'Caveira — evite' },
      { symbol: '▽', meaning: 'nó Delete — destino' },
    ],
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
    levels: {
      1: { pieces: 5, timeLimitMs: 20_000 },
      2: { pieces: 7, timeLimitMs: 16_000 },
      3: { pieces: 9, timeLimitMs: 12_000 },
      4: { pieces: 12, timeLimitMs: 8_000 },
      5: { pieces: 16, timeLimitMs: 5_000 },
    },
    objective: 'Selecione as peças que reconstroem exatamente o Token exibido antes do tempo acabar.',
    howTo: [
      'Observe o Token geométrico alvo no topo da tela.',
      'Avalie as peças avulsas disponíveis embaixo.',
      'Clique nas peças que, somadas, reproduzem o Token exatamente.',
      'Confirme antes que o tempo se esgote.',
    ],
    failsWhen: [
      'A combinação de peças escolhida não reproduz o Token.',
      'O tempo se esgota antes de montar o Token.',
    ],
    legend: [
      { symbol: '◇', meaning: 'Token alvo' },
      { symbol: '▢', meaning: 'peça disponível' },
      { symbol: '▩', meaning: 'peça já selecionada' },
    ],
    create: createTokenine,
  },
];

export const getMinigame = (id: MinigameId): MinigameEntry => {
  const entry = MINIGAMES.find((m) => m.id === id);
  if (!entry) throw new Error(`Minigame desconhecido: ${id}`);
  return entry;
};

export const playableMinigames = (): MinigameEntry[] => MINIGAMES.filter((m) => m.implemented);

/**
 * Constrói o controller já com a dificuldade resolvida: a tabela do nível
 * escolhido no registry é a base e o override (vindo da API, por perfil) tem
 * precedência.
 */
export const createMinigame = (
  id: MinigameId,
  seed: number,
  level: DifficultyLevel = 3,
  override: DifficultyParams = {},
  chainPool?: MinigameId[],
): MinigameController<unknown> => {
  const entry = getMinigame(id);
  return entry.create({ seed, level, difficulty: resolveDifficulty(id, level, override), chainPool });
};
