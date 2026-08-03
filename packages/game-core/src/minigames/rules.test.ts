import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMING_MS } from '../engine/MinigameController.js';
import { KernelCompilerController } from './kernelcompiler/KernelCompilerController.js';
import { MemDefragerController } from './memdefrager/MemDefragerController.js';
import { NodeHexerController } from './nodehexer/NodeHexerController.js';
import type { HexNode } from './nodehexer/NodeHexerController.js';
import { ShiftSeqController } from './shiftseq/ShiftSeqController.js';
import { StackPusherController } from './stackpusher/StackPusherController.js';
import { ZonewallController } from './zonewall/ZonewallController.js';
import { resolveDifficulty } from '../engine/difficulty.js';
import type { DifficultyLevel } from '../engine/difficulty.js';

const click = (targetId?: string) => ({ type: 'pointer' as const, x: 0, y: 0, targetId, at: 0 });

/** Passa direto pela contagem regressiva de arming, comum a todo minigame. */
const skipArming = (game: { tick: (ctx: { dt: number; elapsed: number }) => void }) =>
  game.tick({ dt: ARMING_MS, elapsed: ARMING_MS });

const NODEHEXER_FIXED_GRID = { widthMin: 4, widthMax: 4, heightMin: 4, heightMax: 4 };

/** Constrói uma cadeia de `steps` vizinhos ortogonais não visitados a partir de `start`. */
const buildChain = (start: HexNode, nodes: HexNode[], steps: number): HexNode[] => {
  const chain = [start];
  const visited = new Set([start.id]);
  for (let i = 0; i < steps; i++) {
    const curr = chain[chain.length - 1]!;
    const next = nodes.find(
      (n) => !visited.has(n.id) && Math.abs(n.x - curr.x) + Math.abs(n.y - curr.y) === 1,
    );
    if (!next) throw new Error('grade pequena demais para o teste');
    chain.push(next);
    visited.add(next.id);
  }
  return chain;
};

test('nodeH3X3R aceita passo adjacente sem exigir alternância na hora', () => {
  const game = new NodeHexerController({
    seed: 7,
    level: 3,
    difficulty: { ...NODEHEXER_FIXED_GRID, targets: 0, timeBaseMs: 0 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  const neighbour = nodes.find((n) => Math.abs(n.x - start.x) + Math.abs(n.y - start.y) === 1)!;

  game.handleInput(click(neighbour.id));
  assert.deepEqual(game.getState().path, [startId, neighbour.id]);
});

test('nodeH3X3R liga dois nós do mesmo tipo sem falhar na hora — só a verificação reprova', () => {
  const game = new NodeHexerController({
    seed: 42,
    level: 3,
    difficulty: { ...NODEHEXER_FIXED_GRID, targets: 0, timeBaseMs: 0, breakPenalty: 0.25 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  const neighbour = nodes.find((n) => Math.abs(n.x - start.x) + Math.abs(n.y - start.y) === 1)!;
  neighbour.kind = start.kind; // força a mesma família para o cenário do teste

  game.handleInput(click(neighbour.id));
  assert.deepEqual(game.getState().path, [startId, neighbour.id], 'a ligação é aceita mesmo quebrando a alternância');
  assert.equal(game.snapshot().integrity, 1, 'não há dano imediato');

  game.handleInput({ type: 'key', code: 'Enter', at: 0 });
  assert.ok(game.snapshot().integrity < 1, 'a verificação aplica o dano retroativo');
  assert.equal(game.isOver(), false, 'uma falha de verificação não encerra a run fora do nível 5');
});

test('nodeH3X3R resolve blocked ao verificar uma rota alternada, contínua e completa', () => {
  const game = new NodeHexerController({
    seed: 9,
    level: 3,
    difficulty: { ...NODEHEXER_FIXED_GRID, targets: 0, timeBaseMs: 0 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  const chain = buildChain(start, nodes, 3);
  chain.forEach((node, i) => {
    node.kind = i % 2 === 0 ? 'alpha' : 'beta';
    if (i > 0) node.isTarget = true;
  });

  for (const node of chain.slice(1)) game.handleInput(click(node.id));
  assert.equal(game.getState().targetsRemaining, 0);

  game.handleInput({ type: 'key', code: 'Enter', at: 0 });
  assert.equal(game.result().outcome, 'blocked');
});

test('nodeH3X3R soma tempo extra ao alcançar um nó corrompido', () => {
  const game = new NodeHexerController({
    seed: 5,
    level: 3,
    difficulty: { ...NODEHEXER_FIXED_GRID, targets: 0, timeBaseMs: 20_000, bonusPerTargetMs: 5_000 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId, timeLeftMs: before } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  const neighbour = nodes.find((n) => Math.abs(n.x - start.x) + Math.abs(n.y - start.y) === 1)!;
  neighbour.isTarget = true;

  game.handleInput(click(neighbour.id));
  assert.equal(game.getState().timeLeftMs, before + 5_000, 'alcançar o alvo soma o bônus ao relógio');
});

test('nodeH3X3R recusa clique em nó repetido durante o traçado', () => {
  const game = new NodeHexerController({
    seed: 3,
    level: 3,
    difficulty: { ...NODEHEXER_FIXED_GRID, targets: 0, timeBaseMs: 0 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  const first = nodes.find((n) => Math.abs(n.x - start.x) + Math.abs(n.y - start.y) === 1)!;
  game.handleInput(click(first.id));

  const second = nodes.find(
    (n) => n.id !== start.id && Math.abs(n.x - first.x) + Math.abs(n.y - first.y) === 1,
  )!;
  game.handleInput(click(second.id));

  // Clique no nó inicial: já visitado, mas não é o passo imediatamente anterior (que é `first`).
  game.handleInput(click(startId));
  assert.deepEqual(
    game.getState().path,
    [startId, first.id, second.id],
    'o clique em nó repetido não altera o caminho',
  );
});

/** Posição da barra garantidamente fora da zona-alvo da linha, com boa margem. */
const outsideZone = (row: { zoneStart: number; zoneEnd: number }) =>
  (row.zoneStart + row.zoneEnd) / 2 < 0.5 ? 1 : 0;

test('Zonewall conta hit e avança a linha ao acionar dentro da zona-alvo', () => {
  const game = new ZonewallController({
    seed: 3,
    level: 3,
    difficulty: { rows: 3, hitsNeeded: 3, zoneWidth: 0.2, speed: 0 },
  });
  game.start();
  skipArming(game);

  const row = game.getState().rows[0]!;
  (game as unknown as { bar: number }).bar = (row.zoneStart + row.zoneEnd) / 2;
  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  const state = game.getState();
  assert.equal(state.rows[0]!.outcome, 'hit');
  assert.equal(state.activeRowIndex, 1, 'acerto também avança para a próxima linha');
  assert.equal(state.hits, 1);
});

test('Zonewall conta miss e avança a linha ao acionar fora da zona-alvo', () => {
  const game = new ZonewallController({
    seed: 5,
    level: 3,
    difficulty: { rows: 4, hitsNeeded: 1, zoneWidth: 0.05, speed: 0 },
  });
  game.start();
  skipArming(game);

  const row = game.getState().rows[0]!;
  (game as unknown as { bar: number }).bar = outsideZone(row);
  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  const state = game.getState();
  assert.equal(state.rows[0]!.outcome, 'miss');
  assert.equal(state.activeRowIndex, 1, 'erro também avança para a próxima linha');
  assert.equal(state.misses, 1);
});

test('Zonewall resolve como breached ao atingir o limite de erros', () => {
  const game = new ZonewallController({
    seed: 11,
    level: 3,
    difficulty: { rows: 4, hitsNeeded: 3, zoneWidth: 0.05, speed: 0 },
  });
  game.start();
  skipArming(game);

  // maxMisses = rows - hitsNeeded + 1 = 2: dois erros já inviabilizam o bloqueio.
  for (let i = 0; i < 2; i++) {
    const row = game.getState().rows[game.getState().activeRowIndex]!;
    (game as unknown as { bar: number }).bar = outsideZone(row);
    game.handleInput({ type: 'key', code: 'Space', at: 0 });
  }

  assert.equal(game.result().outcome, 'breached');
});

test('Zonewall resolve como blocked ao atingir os acertos necessários antes de terminar as linhas', () => {
  const game = new ZonewallController({
    seed: 21,
    level: 3,
    difficulty: { rows: 5, hitsNeeded: 2, zoneWidth: 0.2, speed: 0 },
  });
  game.start();
  skipArming(game);

  for (let i = 0; i < 2; i++) {
    const row = game.getState().rows[game.getState().activeRowIndex]!;
    (game as unknown as { bar: number }).bar = (row.zoneStart + row.zoneEnd) / 2;
    game.handleInput({ type: 'key', code: 'Space', at: 0 });
  }

  assert.equal(game.result().outcome, 'blocked');
  assert.equal(game.getState().activeRowIndex, 1, 'insta hack block não deve esperar as linhas restantes');
});

test('Zonewall inclui chainTo no resultado quando o chainPool é fornecido e o hack é invadido', () => {
  const game = new ZonewallController({
    seed: 13,
    level: 3,
    difficulty: { rows: 1, hitsNeeded: 1, zoneWidth: 0.1, speed: 0 },
    chainPool: ['memdefrager', 'nodehexer'],
  });
  game.start();
  skipArming(game);

  const row = game.getState().rows[0]!;
  (game as unknown as { bar: number }).bar = outsideZone(row);
  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  const result = game.result();
  assert.equal(result.outcome, 'breached');
  assert.ok(result.chainTo === 'memdefrager' || result.chainTo === 'nodehexer');
});

test('arming descarta input e mantém a fase até a contagem regressiva zerar', () => {
  const game = new ZonewallController({
    seed: 9,
    level: 3,
    difficulty: { rows: 1, hitsNeeded: 1, zoneWidth: 0.1, speed: 0 },
  });
  game.start();

  assert.equal(game.snapshot().phase, 'arming');
  assert.equal(game.snapshot().armingMsLeft, ARMING_MS);

  const row = game.getState().rows[0]!;
  (game as unknown as { bar: number }).bar = outsideZone(row);
  game.handleInput({ type: 'key', code: 'Space', at: 0 });
  assert.equal(game.snapshot().phase, 'arming', 'input durante arming não deve ter efeito');
  assert.equal(game.isOver(), false, 'a run não deve resolver durante arming');

  game.tick({ dt: ARMING_MS / 2, elapsed: ARMING_MS / 2 });
  assert.equal(game.snapshot().phase, 'arming', 'meia contagem ainda não arma');
  assert.ok(game.snapshot().armingMsLeft > 0);

  game.tick({ dt: ARMING_MS / 2, elapsed: ARMING_MS });
  assert.equal(game.snapshot().phase, 'running', 'a contagem regressiva deve terminar em running');
  assert.equal(game.snapshot().armingMsLeft, 0);

  game.handleInput({ type: 'key', code: 'Space', at: 0 });
  assert.equal(game.result().outcome, 'breached', 'depois de armado o input volta a valer');
});

/** Força a fase 'input' sem depender do tempo de exibição — o alvo é a regra, não o timer. */
const forceInputStage = (game: unknown) => {
  (game as { stage: string }).stage = 'input';
};

const sequenceOf = (game: unknown): string[] => (game as { sequence: string[] }).sequence;

test('memD3FR4G3R conclui todas as rodadas com a sequência correta e resolve blocked', () => {
  const game = new MemDefragerController({
    seed: 4,
    level: 3,
    difficulty: { gridSize: 3, rounds: 2, roundLengths: '2,3', itemMs: 500, replays: 1, attempts: 2 },
  });
  game.start();
  skipArming(game);

  forceInputStage(game);
  for (const id of sequenceOf(game)) game.handleInput(click(id));

  assert.equal(game.getState().round, 2, 'conclui a rodada 1 e avança para a rodada 2');
  assert.equal(game.isOver(), false);

  // A rodada 2 já entra automaticamente em 'showing' — força 'input' de novo.
  forceInputStage(game);
  for (const id of sequenceOf(game)) game.handleInput(click(id));

  assert.equal(game.result().outcome, 'blocked');
});

test('memD3FR4G3R zera a rodada e consome tentativa ao clicar errado', () => {
  const game = new MemDefragerController({
    seed: 6,
    level: 3,
    difficulty: { gridSize: 3, rounds: 1, roundLengths: '3', itemMs: 500, replays: 1, attempts: 2 },
  });
  game.start();
  skipArming(game);
  forceInputStage(game);

  const sequence = sequenceOf(game);
  const wrongId = game.getState().cells.map((c) => c.id).find((id) => id !== sequence[1])!;

  game.handleInput(click(sequence[0])); // acerto
  game.handleInput(click(wrongId)); // erro

  const state = game.getState();
  assert.equal(state.entered.length, 0, 'o erro zera o progresso só da rodada atual');
  assert.equal(state.attemptsLeft, 1, 'o erro consome uma tentativa do hack');
  assert.equal(game.isOver(), false, 'ainda resta 1 tentativa — a run inteira não zera');
});

test('memD3FR4G3R replay consome contador e é recusado quando zerado', () => {
  const game = new MemDefragerController({
    seed: 8,
    level: 3,
    difficulty: { gridSize: 3, rounds: 1, roundLengths: '3', itemMs: 500, replays: 1, attempts: 2 },
  });
  game.start();
  skipArming(game);
  forceInputStage(game);

  assert.equal(game.getState().replaysLeft, 1);

  game.handleInput(click('central'));
  assert.equal(game.getState().replaysLeft, 0, 'reprisar consome o contador');
  assert.equal(game.getState().stage, 'showing', 'reprisar volta para a exibição');

  forceInputStage(game);
  game.handleInput(click('central'));
  assert.equal(game.getState().replaysLeft, 0, 'sem replays restantes, o contador não fica negativo');
  assert.equal(game.getState().stage, 'input', 'sem replays restantes, o clique não reexibe a sequência');
});

type KeyGame = { handleInput: (input: { type: 'key'; code: string; char?: string; at: number }) => void };

const typeChar = (char: string) => ({ type: 'key' as const, code: 'Char', char, at: 0 });
const pressEnter = (game: KeyGame) => game.handleInput({ type: 'key', code: 'Enter', at: 0 });
const pressBackspace = (game: KeyGame) => game.handleInput({ type: 'key', code: 'Backspace', at: 0 });
const typeText = (game: KeyGame, text: string) => {
  for (const char of text) game.handleInput(typeChar(char));
};

test('K3RN3LC0MP1L3R digita a linha e avança para a próxima com Enter', () => {
  const game = new KernelCompilerController({
    seed: 1,
    level: 1,
    difficulty: { blocks: 1, linesPerBlock: 2, lineLength: 6, timeLimitMs: 0 },
  });
  game.start();
  skipArming(game);

  const line = game.getState().blocks[0]!.lines[0]!.text;
  typeText(game, line);
  pressEnter(game);

  const state = game.getState();
  assert.equal(state.lineIndex, 1, 'avança para a próxima linha do bloco');
  assert.equal(state.buffer, '', 'o buffer é limpo ao avançar');
});

test('K3RN3LC0MP1L3R trava o avanço num caractere errado até o Backspace resolver', () => {
  const game = new KernelCompilerController({
    seed: 2,
    level: 1,
    difficulty: { blocks: 1, linesPerBlock: 1, lineLength: 6, timeLimitMs: 0 },
  });
  game.start();
  skipArming(game);

  const line = game.getState().blocks[0]!.lines[0]!.text;
  const wrongChar = line[0] === 'z' ? 'y' : 'z'; // garante um caractere diferente do alvo
  game.handleInput(typeChar(wrongChar));
  assert.equal(game.getState().errorIndex, 0, 'marca a posição do erro');

  game.handleInput(typeChar(line[1]!));
  assert.equal(game.getState().buffer, wrongChar, 'nada avança enquanto houver erro');

  pressBackspace(game);
  assert.equal(game.getState().buffer, '', 'o backspace remove o caractere errado');
  assert.equal(game.getState().errorIndex, null, 'o erro é resolvido');

  typeText(game, line);
  assert.equal(game.getState().buffer, line, 'a digitação retoma normalmente após o backspace');
});

test('K3RN3LC0MP1L3R resolve blocked ao concluir o último bloco', () => {
  const game = new KernelCompilerController({
    seed: 3,
    level: 1,
    difficulty: { blocks: 2, linesPerBlock: 1, lineLength: 5, timeLimitMs: 0 },
  });
  game.start();
  skipArming(game);

  for (let i = 0; i < 2; i++) {
    const state = game.getState();
    const line = state.blocks[state.blockIndex]!.lines[state.lineIndex]!.text;
    typeText(game, line);
    pressEnter(game);
  }

  assert.equal(game.result().outcome, 'blocked');
});

test('K3RN3LC0MP1L3R resolve breached ao estourar o tempo', () => {
  const game = new KernelCompilerController({
    seed: 4,
    level: 2,
    difficulty: { blocks: 1, linesPerBlock: 1, lineLength: 6, timeLimitMs: 1_000 },
  });
  game.start();
  skipArming(game);

  game.tick({ dt: 1_000, elapsed: 1_000 });
  assert.equal(game.result().outcome, 'breached');
});

const SHIFTSEQ_BASE_DIFFICULTY = {
  gridSize: 5, infectedNodes: 1, nodeHealth: 4, attackIntervalMs: 999_999,
  homeDamagePercent: 0.2, batteryMax: 100, hitCost: 6, rechargeWindowMs: 200, lockoutMs: 1_000,
};

type ShiftSeqPrivate = {
  playerX: number;
  playerY: number;
  battery: number;
  pulseElapsedMs: number;
  pulsePeriodMs: number;
  attacks: Array<{ id: string; nodeId: string; originX: number; originY: number; progress: number; travelMs: number }>;
};

test('shiftSEQ causa dano quando um ataque chega ao home com o jogador fora', () => {
  const game = new ShiftSeqController({ seed: 1, level: 3, difficulty: SHIFTSEQ_BASE_DIFFICULTY });
  game.start();
  skipArming(game);

  const priv = game as unknown as ShiftSeqPrivate;
  priv.playerX = 0;
  priv.playerY = 0; // longe do Home Node (2,2 numa grade 5x5)
  priv.attacks = [{ id: 'atk0', nodeId: 'n0', originX: 4, originY: 4, progress: 0.999, travelMs: 1_000 }];

  game.tick({ dt: 10, elapsed: 10 });

  assert.ok(game.snapshot().integrity < 1, 'o ataque causa dano à saúde da conexão');
});

test('shiftSEQ suprime os ataques do nó enquanto o jogador estiver dentro dele', () => {
  const game = new ShiftSeqController({
    seed: 2,
    level: 3,
    difficulty: { ...SHIFTSEQ_BASE_DIFFICULTY, attackIntervalMs: 500 },
  });
  game.start();
  skipArming(game);

  const node = game.getState().nodes[0]!;
  const priv = game as unknown as ShiftSeqPrivate;
  priv.playerX = node.x;
  priv.playerY = node.y;

  game.tick({ dt: 1_000, elapsed: 1_000 }); // bem além do intervalo de ataque

  assert.equal(game.getState().attacks.length, 0, 'nenhum ataque é disparado enquanto o jogador ocupa o nó');
});

test('shiftSEQ recarrega a bateria ao acertar o timing do pulso', () => {
  const game = new ShiftSeqController({ seed: 3, level: 3, difficulty: SHIFTSEQ_BASE_DIFFICULTY });
  game.start();
  skipArming(game);

  const priv = game as unknown as ShiftSeqPrivate;
  priv.battery = 10;
  priv.pulseElapsedMs = priv.pulsePeriodMs * 0.82; // exatamente no alvo do pulso

  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  assert.equal(game.getState().battery, 100, 'acerta o timing e enche a bateria');
});

test('shiftSEQ erra o timing da recarga e aplica lockout', () => {
  const game = new ShiftSeqController({
    seed: 4,
    level: 3,
    difficulty: { ...SHIFTSEQ_BASE_DIFFICULTY, rechargeWindowMs: 100, lockoutMs: 2_500 },
  });
  game.start();
  skipArming(game);

  const priv = game as unknown as ShiftSeqPrivate;
  priv.battery = 10;
  priv.pulseElapsedMs = 0; // bem longe do alvo (82% do ciclo)

  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  const state = game.getState();
  assert.equal(state.battery, 10, 'erro no timing não recarrega a bateria');
  assert.equal(state.rechargeLockoutMsLeft, 2_500, 'aplica o lockout completo');
});

test('shiftSEQ resolve blocked ao destruir todos os nós infectados', () => {
  const game = new ShiftSeqController({
    seed: 5,
    level: 3,
    difficulty: { ...SHIFTSEQ_BASE_DIFFICULTY, nodeHealth: 1 },
  });
  game.start();
  skipArming(game);

  const node = game.getState().nodes[0]!;
  const priv = game as unknown as ShiftSeqPrivate;
  priv.playerX = node.x;
  priv.playerY = node.y;

  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  assert.equal(game.result().outcome, 'blocked');
});

type StackPusherPrivate = {
  pusherX: number;
  pusherY: number;
  deleteX: number;
  deleteY: number;
  stacks: Array<{ id: string; x: number; y: number }>;
};

const STACKPUSHER_BASE_DIFFICULTY = {
  gridSizeMin: 6, gridSizeMax: 6, stacks: 1, skulls: 0, timeLimitMs: 0, moveLimit: 0, skullsHidden: false,
};

/** Reimplementação independente da busca de alcançabilidade, só para verificar o contrato de fora. */
const isReachable = (
  gridSize: number,
  skulls: Array<{ x: number; y: number }>,
  start: { x: number; y: number },
  target: { x: number; y: number },
): boolean => {
  const skullSet = new Set(skulls.map((s) => `${s.x}-${s.y}`));
  const hasPusherSpot = (ax: number, ay: number, bx: number, by: number): boolean => {
    const pxMin = Math.max(0, Math.max(ax, bx) - 1);
    const pxMax = Math.min(gridSize - 1, Math.min(ax, bx) + 1);
    const pyMin = Math.max(0, Math.max(ay, by) - 1);
    const pyMax = Math.min(gridSize - 1, Math.min(ay, by) + 1);
    for (let px = pxMin; px <= pxMax; px++) {
      for (let py = pyMin; py <= pyMax; py++) {
        if (px === ax && py === ay) continue;
        if (px === bx && py === by) continue;
        if (skullSet.has(`${px}-${py}`)) continue;
        return true;
      }
    }
    return false;
  };

  if (start.x === target.x && start.y === target.y) return true;
  const visited = new Set([`${start.x}-${start.y}`]);
  const queue: Array<[number, number]> = [[start.x, start.y]];
  while (queue.length > 0) {
    const [ax, ay] = queue.shift()!;
    const bxMin = Math.max(0, ax - 2);
    const bxMax = Math.min(gridSize - 1, ax + 2);
    const byMin = Math.max(0, ay - 2);
    const byMax = Math.min(gridSize - 1, ay + 2);
    for (let bx = bxMin; bx <= bxMax; bx++) {
      for (let by = byMin; by <= byMax; by++) {
        if (bx === ax && by === ay) continue;
        const k = `${bx}-${by}`;
        if (visited.has(k) || skullSet.has(k)) continue;
        if (!hasPusherSpot(ax, ay, bx, by)) continue;
        if (bx === target.x && by === target.y) return true;
        visited.add(k);
        queue.push([bx, by]);
      }
    }
  }
  return false;
};

test('stackPUSHER não move um Stack fora do raio 3x3 do Pusher', () => {
  const game = new StackPusherController({ seed: 1, level: 1, difficulty: STACKPUSHER_BASE_DIFFICULTY });
  game.start();
  skipArming(game);

  const priv = game as unknown as StackPusherPrivate;
  priv.pusherX = 0;
  priv.pusherY = 0;
  priv.stacks = [{ id: 's0', x: 5, y: 5 }]; // bem fora do raio 3x3 de (0,0)

  game.handleInput(click('5-5')); // tenta selecionar o stack fora do alcance
  game.handleInput(click('4-5')); // tenta soltar mesmo sem seleção válida

  const stack = game.getState().stacks[0]!;
  assert.equal(stack.x, 5, 'o stack fora do raio não se move em x');
  assert.equal(stack.y, 5, 'o stack fora do raio não se move em y');
});

test('stackPUSHER remove o Stack e decrementa o contador ao chegar no Delete', () => {
  const game = new StackPusherController({ seed: 2, level: 1, difficulty: STACKPUSHER_BASE_DIFFICULTY });
  game.start();
  skipArming(game);

  const priv = game as unknown as StackPusherPrivate;
  priv.pusherX = 2;
  priv.pusherY = 2;
  priv.deleteX = 3;
  priv.deleteY = 2; // dentro do raio 3x3 de (2,2)
  priv.stacks = [{ id: 's0', x: 2, y: 3 }]; // também dentro do raio

  game.handleInput(click('2-3')); // seleciona o stack
  game.handleInput(click('3-2')); // solta no Delete

  const state = game.getState();
  assert.equal(state.stacks.length, 0, 'o stack some da lista');
  assert.equal(state.stacksRemaining, 0, 'o contador de stacks restantes decrementa');
});

test('stackPUSHER resolve breached ao clicar numa caveira', () => {
  const game = new StackPusherController({
    seed: 3,
    level: 1,
    difficulty: { ...STACKPUSHER_BASE_DIFFICULTY, skulls: 1 },
  });
  game.start();
  skipArming(game);

  const skull = game.getState().skulls[0]!;
  game.handleInput(click(`${skull.x}-${skull.y}`));

  assert.equal(game.result().outcome, 'breached');
});

test('stackPUSHER gera sempre um layout com solução, em todos os níveis', () => {
  const levels: DifficultyLevel[] = [1, 2, 3, 4, 5];
  for (const level of levels) {
    const difficulty = resolveDifficulty('stackpusher', level);
    for (let seed = 0; seed < 15; seed++) {
      const game = new StackPusherController({ seed, level, difficulty });
      game.start();
      const state = game.getState();
      for (const stack of state.stacks) {
        assert.ok(
          isReachable(state.gridSize, state.skulls, stack, { x: state.deleteX, y: state.deleteY }),
          `nível ${level} seed ${seed}: stack ${stack.id} sem rota até o Delete`,
        );
      }
    }
  }
});
