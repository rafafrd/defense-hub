import type { MinigameController } from './engine/MinigameController.js';
import type { DifficultyParams, MinigameConfig, MinigameId, RendererKind } from './engine/types.js';
import type { DifficultyLevel, DifficultyTable } from './engine/difficulty.js';
import { resolveDifficulty } from './engine/difficulty.js';
import { ZonewallController } from './minigames/zonewall/ZonewallController.js';
import { MemDefragerController } from './minigames/memdefrager/MemDefragerController.js';
import { NodeHexerController } from './minigames/nodehexer/NodeHexerController.js';
import { KernelCompilerController } from './minigames/kernelcompiler/KernelCompilerController.js';
import { createMemDeallocater } from './minigames/memdeallocater/spec.js';
import { ShiftSeqController } from './minigames/shiftseq/ShiftSeqController.js';
import { StackPusherController } from './minigames/stackpusher/StackPusherController.js';
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
    brief: 'Memorize a sequência exibida no bloco central e repita na grade.',
    controls: 'Clique',
    implemented: true,
    levels: {
      1: { gridSize: 3, rounds: 1, roundLengths: '4', itemMs: 800, replays: 3, attempts: 3 },
      2: { gridSize: 4, rounds: 1, roundLengths: '6', itemMs: 620, replays: 2, attempts: 3 },
      3: { gridSize: 4, rounds: 2, roundLengths: '7,9', itemMs: 450, replays: 1, attempts: 2 },
      4: { gridSize: 5, rounds: 3, roundLengths: '8,11,13', itemMs: 320, replays: 1, attempts: 2 },
      5: { gridSize: 6, rounds: 3, roundLengths: '12,15,18', itemMs: 210, replays: 0, attempts: 1 },
    },
    objective: 'Complete todas as rodadas repetindo, na grade, a sequência exibida no bloco central.',
    howTo: [
      'Memorize a sequência de endereços exibida no bloco central — a grade nunca pisca.',
      'Clique nas células da grade que correspondem a cada endereço, na mesma ordem.',
      'Sem replays, o bloco central pode reprisar a exibição — recurso limitado por nível.',
      'Complete todas as rodadas; cada uma sorteia uma sequência nova e mais longa.',
    ],
    failsWhen: [
      'Você clica uma célula fora de ordem e esgota todas as tentativas do hack.',
    ],
    legend: [
      { symbol: '▮ central', meaning: 'bloco com a sequência — clique para reprisar' },
      { symbol: '▮ numerado', meaning: 'célula já confirmada (níveis 1-2)' },
    ],
    create: (config) => new MemDefragerController(config),
  },
  {
    id: 'nodehexer',
    label: 'nodeH3X3R',
    group: 'WTTG2',
    renderer: 'dom',
    brief: 'Trace livremente e só depois verifique: alternância, continuidade e alvos cobertos.',
    controls: 'Clique · Enter para verificar',
    implemented: true,
    levels: {
      1: {
        widthMin: 4, widthMax: 5, heightMin: 4, heightMax: 5, targets: 3,
        timeBaseMs: 60_000, bonusPerTargetMs: 6_000, breakPenalty: 0.12, deadNodes: 0,
      },
      2: {
        widthMin: 5, widthMax: 6, heightMin: 5, heightMax: 6, targets: 4,
        timeBaseMs: 50_000, bonusPerTargetMs: 5_000, breakPenalty: 0.18, deadNodes: 0,
      },
      3: {
        widthMin: 6, widthMax: 7, heightMin: 6, heightMax: 7, targets: 5,
        timeBaseMs: 42_000, bonusPerTargetMs: 4_000, breakPenalty: 0.25, deadNodes: 0,
      },
      4: {
        widthMin: 7, widthMax: 8, heightMin: 7, heightMax: 8, targets: 6,
        timeBaseMs: 34_000, bonusPerTargetMs: 3_000, breakPenalty: 0.35, deadNodes: 4,
      },
      5: {
        widthMin: 8, widthMax: 9, heightMin: 8, heightMax: 9, targets: 8,
        timeBaseMs: 26_000, bonusPerTargetMs: 2_000, breakPenalty: 0.5, deadNodes: 6, hardCollapse: true,
      },
    },
    objective: 'Trace uma rota cobrindo todos os nós corrompidos e verifique antes que o tempo acabe.',
    howTo: [
      'Comece no nó inicial (destacado) e clique nós vizinhos para estender a rota.',
      'Ligar dois nós do mesmo tipo não falha na hora — só a verificação cobra a alternância Alfa/Beta.',
      'Clique em "verificar rota" (ou Enter) quando achar que cobriu todos os nós corrompidos.',
      'Clique no nó anterior do caminho para desfazer um passo sem penalidade.',
      'Alcançar um nó corrompido soma tempo extra ao cronômetro.',
    ],
    failsWhen: [
      'A verificação encontra uma ligação entre nós do mesmo tipo, um salto descontínuo ou um alvo não coberto.',
      'O tempo do traçado se esgota.',
      'A partir do nível 5, uma única verificação reprovada já derruba a rota traçada.',
    ],
    legend: [
      { symbol: '■ Alfa', meaning: 'nó quadrado' },
      { symbol: '● Beta', meaning: 'nó circular' },
      { symbol: '◈', meaning: 'nó corrompido (alvo)' },
      { symbol: '✕ opaco', meaning: 'nó morto — não pode entrar na rota (níveis 4-5)' },
    ],
    create: (config) => new NodeHexerController(config),
  },
  {
    id: 'kernelcompiler',
    label: 'K3RN3LC0MP1L3R',
    group: 'WTTG3',
    renderer: 'dom',
    brief: 'Digite exatamente a linha destacada e submeta com Enter; typo só sai no Backspace.',
    controls: 'Teclado, Backspace, Enter',
    implemented: true,
    levels: {
      1: { blocks: 1, linesPerBlock: 3, lineLength: 18, timeLimitMs: 0 },
      2: { blocks: 1, linesPerBlock: 4, lineLength: 26, timeLimitMs: 90_000 },
      3: { blocks: 2, linesPerBlock: 4, lineLength: 34, timeLimitMs: 75_000 },
      4: { blocks: 3, linesPerBlock: 5, lineLength: 44, timeLimitMs: 70_000, errorPenaltyMs: 2_000 },
      5: { blocks: 4, linesPerBlock: 6, lineLength: 60, timeLimitMs: 60_000, errorPenaltyMs: 2_000 },
    },
    objective: 'Digite corretamente todas as linhas de todos os blocos de memória corrompida antes que o tempo acabe.',
    howTo: [
      'Leia a linha destacada e digite os caracteres na ordem exata, incluindo espaços.',
      'Aperte Enter para submeter a linha completa.',
      'Se errar, o caractere aparece em vermelho — só Backspace resolve, nada mais avança.',
      'Complete todas as linhas de todos os blocos para bloquear o ataque.',
    ],
    failsWhen: [
      'Você submete a linha com um erro não corrigido ou incompleta — pequena penalidade, tenta de novo.',
      'O tempo se esgota.',
      'A partir do nível 4, cada typo também desconta tempo do cronômetro.',
    ],
    legend: [
      { symbol: 'vermelho', meaning: 'caractere digitado errado' },
      { symbol: 'verde', meaning: 'caractere já confirmado' },
      { symbol: '·', meaning: 'espaço — precisa ser digitado também' },
    ],
    create: (config) => new KernelCompilerController(config),
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
    brief: 'Destrua os nós infectados e recarregue a bateria no timing certo do pulso.',
    controls: 'WASD, Espaço',
    implemented: true,
    levels: {
      1: {
        gridSize: 5, infectedNodes: 2, nodeHealth: 4, attackIntervalMs: 3_200,
        homeDamagePercent: 0.08, batteryMax: 100, hitCost: 6, rechargeWindowMs: 300, lockoutMs: 1_200,
      },
      2: {
        gridSize: 6, infectedNodes: 3, nodeHealth: 5, attackIntervalMs: 2_500,
        homeDamagePercent: 0.12, batteryMax: 100, hitCost: 7, rechargeWindowMs: 240, lockoutMs: 2_000,
      },
      3: {
        gridSize: 7, infectedNodes: 4, nodeHealth: 6, attackIntervalMs: 1_800,
        homeDamagePercent: 0.16, batteryMax: 90, hitCost: 8, rechargeWindowMs: 170, lockoutMs: 3_000,
      },
      4: {
        gridSize: 8, infectedNodes: 5, nodeHealth: 8, attackIntervalMs: 1_300,
        homeDamagePercent: 0.22, batteryMax: 80, hitCost: 9, rechargeWindowMs: 120, lockoutMs: 4_000,
      },
      5: {
        gridSize: 9, infectedNodes: 6, nodeHealth: 10, attackIntervalMs: 900,
        homeDamagePercent: 0.30, batteryMax: 70, hitCost: 10, rechargeWindowMs: 85, lockoutMs: 5_000,
      },
    },
    objective: 'Destrua todos os nós infectados antes que um ataque atinja o Home Node com você fora dele.',
    howTo: [
      'Mova-se pela grade com WASD a partir do Home Node.',
      'Pise num nó infectado para suprimir os disparos dele e martele Espaço para desgastar a vida até destruí-lo.',
      'Cada golpe consome bateria — volte ao Home Node antes que ela acabe.',
      'No Home Node, aperte Espaço no instante em que o anel pulsante alinha com o contorno-alvo para recarregar tudo.',
      'Errar o timing da recarga trava o Home Node por um tempo — planeje a volta com folga.',
    ],
    failsWhen: [
      'Um ataque chega ao Home Node enquanto você está fora dele — essa é a única forma de perder.',
    ],
    legend: [
      { symbol: '◆ vermelho', meaning: 'nó infectado (vida desenhada em cima)' },
      { symbol: '■ âmbar', meaning: 'Home Node' },
      { symbol: '● viajando', meaning: 'ataque em trânsito rumo ao Home Node' },
      { symbol: 'anel pulsante', meaning: 'janela de recarga — acerte o contorno-alvo' },
    ],
    create: (config) => new ShiftSeqController(config),
  },
  {
    id: 'stackpusher',
    label: 'stackPUSHER',
    group: 'WTTG3',
    renderer: 'dom',
    brief: 'Reposicione o Pusher para carregar cada Stack, célula a célula, até o nó Delete.',
    controls: 'Clique',
    implemented: true,
    levels: {
      1: {
        gridSizeMin: 5, gridSizeMax: 6, stacks: 2, skulls: 0,
        timeLimitMs: 0, moveLimit: 0, skullsHidden: false,
      },
      2: {
        gridSizeMin: 6, gridSizeMax: 7, stacks: 3, skulls: 2,
        timeLimitMs: 0, moveLimit: 0, skullsHidden: false,
      },
      3: {
        gridSizeMin: 7, gridSizeMax: 8, stacks: 4, skulls: 4,
        timeLimitMs: 120_000, moveLimit: 0, skullsHidden: false,
      },
      4: {
        gridSizeMin: 8, gridSizeMax: 9, stacks: 5, skulls: 7,
        timeLimitMs: 100_000, moveLimit: 0, skullsHidden: true,
      },
      5: {
        gridSizeMin: 9, gridSizeMax: 10, stacks: 6, skulls: 10,
        timeLimitMs: 80_000, moveLimit: 40, skullsHidden: true,
      },
    },
    objective: 'Empurre todos os nós Stack até o nó Delete sem tocar nas caveiras.',
    howTo: [
      'Clique no Pusher para pegá-lo e clique numa casa livre para soltá-lo ali — em qualquer lugar do tabuleiro.',
      'Clique num Stack dentro do raio 3x3 do Pusher para selecioná-lo.',
      'Clique numa casa livre, também dentro desse raio 3x3, para movê-lo até lá.',
      'Reposicione o Pusher e repita até levar todos os Stacks ao nó Delete.',
    ],
    failsWhen: [
      'Você clica numa caveira, ou solta o Pusher ou um Stack sobre uma.',
      'A partir do nível 3, o tempo se esgota.',
      'No nível 5, você excede o limite de 40 movimentos.',
    ],
    legend: [
      { symbol: '▲', meaning: 'Pusher' },
      { symbol: '■', meaning: 'Stack' },
      { symbol: '☠', meaning: 'Caveira — evite (oculta até ficar adjacente ao Pusher a partir do nível 4)' },
      { symbol: '▽', meaning: 'nó Delete — destino' },
    ],
    create: (config) => new StackPusherController(config),
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
