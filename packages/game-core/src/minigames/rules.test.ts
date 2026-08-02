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

test('Zonewall derruba a conexão ao acionar em zona hostil', () => {
  const game = new ZonewallController({
    seed: 3,
    level: 3,
    difficulty: { safeZones: 2, hostileZones: 2, speed: 0 },
  });
  game.start();
  skipArming(game);

  const hostile = game.getState().zones.find((z) => z.kind === 'hostile')!;
  // Posiciona a barra dentro da zona vermelha sem depender do tempo.
  (game as unknown as { bar: number }).bar = (hostile.start + hostile.end) / 2;
  game.handleInput({ type: 'key', code: 'Space', at: 0 });

  assert.equal(game.result().outcome, 'breached');
});

test('arming descarta input e mantém a fase até a contagem regressiva zerar', () => {
  const game = new ZonewallController({
    seed: 9,
    level: 3,
    difficulty: { safeZones: 2, hostileZones: 2, speed: 0 },
  });
  game.start();

  assert.equal(game.snapshot().phase, 'arming');
  assert.equal(game.snapshot().armingMsLeft, ARMING_MS);

  const hostile = game.getState().zones.find((z) => z.kind === 'hostile')!;
  (game as unknown as { bar: number }).bar = (hostile.start + hostile.end) / 2;
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
