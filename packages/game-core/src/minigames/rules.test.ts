import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMING_MS } from '../engine/MinigameController.js';
import { NodeHexerController } from './nodehexer/NodeHexerController.js';
import { ZonewallController } from './zonewall/ZonewallController.js';

const click = (targetId?: string) => ({ type: 'pointer' as const, x: 0, y: 0, targetId, at: 0 });

/** Passa direto pela contagem regressiva de arming, comum a todo minigame. */
const skipArming = (game: { tick: (ctx: { dt: number; elapsed: number }) => void }) =>
  game.tick({ dt: ARMING_MS, elapsed: ARMING_MS });

test('nodeH3X3R quebra a conexão ao ligar dois nós do mesmo tipo', () => {
  const game = new NodeHexerController({
    seed: 42,
    level: 3,
    difficulty: { width: 4, height: 4, targets: 2, timeLimitMs: 0 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  // Vizinho diagonal tem o mesmo tipo no tabuleiro em xadrez: movimento inválido.
  const sameKind = nodes.find(
    (n) => n.kind === start.kind && Math.abs(n.x - start.x) === 1 && Math.abs(n.y - start.y) === 1,
  )!;

  game.handleInput(click(sameKind.id));
  assert.deepEqual(game.getState().path, [startId], 'o caminho deve voltar ao nó inicial');
  assert.ok(game.snapshot().integrity < 1, 'a quebra deve custar saúde da conexão');
});

test('nodeH3X3R aceita passo adjacente que alterna Alfa/Beta', () => {
  const game = new NodeHexerController({
    seed: 7,
    level: 3,
    difficulty: { width: 4, height: 4, targets: 2, timeLimitMs: 0 },
  });
  game.start();
  skipArming(game);

  const { nodes, startId } = game.getState();
  const start = nodes.find((n) => n.id === startId)!;
  const neighbour = nodes.find(
    (n) => Math.abs(n.x - start.x) + Math.abs(n.y - start.y) === 1 && n.kind !== start.kind,
  )!;

  game.handleInput(click(neighbour.id));
  assert.deepEqual(game.getState().path, [startId, neighbour.id]);
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
