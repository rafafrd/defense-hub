import { MinigameController } from '../../engine/MinigameController.js';
import type { GameInput, MinigameId, RendererKind, TickContext } from '../../engine/types.js';
import type { Rng } from '../../engine/rng.js';
import type { DifficultyLevel } from '../../engine/difficulty.js';

export interface CodeLine {
  text: string;
}

export interface CodeBlock {
  lines: CodeLine[];
}

export interface KernelCompilerState {
  blocks: CodeBlock[];
  blockIndex: number;
  lineIndex: number;
  /** O que o jogador já digitou da linha ativa. */
  buffer: string;
  /** Posição do caractere errado na linha ativa; null enquanto não houver erro. */
  errorIndex: number | null;
  blocksRemaining: number;
  timeLeftMs: number;
  timeLimitMs: number;
}

const WORDS = [
  'kernel', 'buffer', 'memoria', 'processo', 'soquete', 'pacote', 'sinal', 'acesso',
  'sistema', 'registro', 'ponteiro', 'pilha', 'fila', 'thread', 'nucleo', 'cache',
  'disco', 'rede', 'porta', 'fluxo', 'bloco', 'setor', 'vetor', 'matriz', 'indice',
  'ciclo', 'bit', 'byte', 'hash', 'chave', 'no', 'lista', 'arvore', 'grafo', 'trava',
];

const SEGMENTS = [
  'get', 'set', 'init', 'load', 'save', 'node', 'user', 'data', 'hash', 'index',
  'count', 'size', 'flag', 'ptr', 'addr', 'block', 'sector', 'cache', 'queue',
  'stack', 'thread', 'core', 'byte', 'bit', 'key', 'val', 'ref', 'buf', 'pkt', 'sock',
];

const randomIdentifier = (rng: Rng, allowDigits: boolean): string => {
  const segCount = rng.int(1, 3);
  const segs = Array.from({ length: segCount }, () => rng.pick(SEGMENTS));
  let id = segs.join('_');
  if (allowDigits && rng.next() < 0.5) id += `_${rng.int(0, 999)}`;
  return id;
};

const buildSymbolToken = (rng: Rng): string => {
  const templates: Array<() => string> = [
    () => `${randomIdentifier(rng, true)}->${randomIdentifier(rng, false)}`,
    () => `${randomIdentifier(rng, false)}::${randomIdentifier(rng, false)}`,
    () => `${randomIdentifier(rng, false)}[${rng.int(0, 99)}]`,
    () => `{${randomIdentifier(rng, true)}}`,
    () => `$${randomIdentifier(rng, false)}`,
  ];
  return rng.pick(templates)();
};

const mixCase = (rng: Rng, s: string): string =>
  s.split('').map((c) => (/[a-z]/.test(c) && rng.next() < 0.35 ? c.toUpperCase() : c)).join('');

/** Concatena tokens separados por espaço até atingir (e cortar em) o comprimento-alvo. */
const buildFromTokens = (targetLength: number, nextToken: () => string): string => {
  const parts: string[] = [];
  let len = 0;
  while (len < targetLength) {
    const token = nextToken();
    parts.push(token);
    len += token.length + 1;
  }
  return parts.join(' ').slice(0, targetLength);
};

const buildLine = (rng: Rng, level: DifficultyLevel, targetLength: number): string => {
  switch (level) {
    case 1:
      return buildFromTokens(targetLength, () => rng.pick(WORDS));
    case 2:
      return buildFromTokens(targetLength, () => (rng.next() < 0.3 ? String(rng.int(0, 9999)) : rng.pick(WORDS)));
    case 3:
      return buildFromTokens(targetLength, () => randomIdentifier(rng, true));
    case 4:
      return buildFromTokens(targetLength, () => buildSymbolToken(rng));
    case 5:
      return buildFromTokens(targetLength, () => mixCase(rng, buildSymbolToken(rng)));
    default:
      return buildFromTokens(targetLength, () => rng.pick(WORDS));
  }
};

/**
 * K3RN3LC0MP1L3R — digitação sob pressão.
 * Uma linha por vez fica ativa; o jogador reproduz exatamente o texto e
 * submete com Enter. Um caractere errado trava o avanço — só Backspace
 * resolve — e a linha só é aceita quando o buffer bate 100% com o alvo.
 * Vários blocos de linhas corrompidas se acumulam nos níveis mais altos.
 */
export class KernelCompilerController extends MinigameController<KernelCompilerState> {
  readonly id: MinigameId = 'kernelcompiler';
  readonly renderer: RendererKind = 'dom';
  readonly label = 'K3RN3LC0MP1L3R';

  private blocks: CodeBlock[] = [];
  private blockIndex = 0;
  private lineIndex = 0;
  private buffer = '';
  private errorIndex: number | null = null;
  private timeLimitMs = 0;
  private errorPenaltyMs = 0;

  protected setup(): void {
    const blockCount = Math.max(1, Math.round(this.num('blocks', 1)));
    const linesPerBlock = Math.max(1, Math.round(this.num('linesPerBlock', 3)));
    const lineLength = Math.max(4, Math.round(this.num('lineLength', 18)));
    this.timeLimitMs = this.num('timeLimitMs', 0);
    this.errorPenaltyMs = this.num('errorPenaltyMs', 0);

    this.blocks = Array.from({ length: blockCount }, () => ({
      lines: Array.from({ length: linesPerBlock }, () => ({
        text: buildLine(this.rng, this.config.level, lineLength),
      })),
    }));

    this.blockIndex = 0;
    this.lineIndex = 0;
    this.buffer = '';
    this.errorIndex = null;
  }

  protected onTick(ctx: TickContext): void {
    if (this.timeLimitMs > 0 && ctx.elapsed >= this.timeLimitMs) {
      this.resolve('breached', 'Tempo esgotado na compilação');
    }
  }

  protected onInput(input: GameInput): void {
    if (input.type !== 'key') return;

    if (input.code === 'Backspace') {
      if (this.buffer.length > 0) this.buffer = this.buffer.slice(0, -1);
      this.recomputeError();
      return;
    }

    if (input.code === 'Enter') {
      this.submit();
      return;
    }

    if (!input.char || this.errorIndex !== null) return;
    const target = this.currentLine();
    if (this.buffer.length >= target.length) return;

    this.buffer += input.char;
    this.recomputeError();
    if (this.errorIndex !== null && this.errorPenaltyMs > 0) {
      this.timeLimitMs = Math.max(0, this.timeLimitMs - this.errorPenaltyMs);
    }
  }

  getState(): KernelCompilerState {
    return {
      blocks: this.blocks,
      blockIndex: this.blockIndex,
      lineIndex: this.lineIndex,
      buffer: this.buffer,
      errorIndex: this.errorIndex,
      blocksRemaining: this.blocks.length - this.blockIndex,
      timeLeftMs: Math.max(0, this.timeLimitMs - this.elapsed),
      timeLimitMs: this.timeLimitMs,
    };
  }

  getProgress(): number {
    const totalLines = this.blocks.reduce((sum, b) => sum + b.lines.length, 0);
    if (totalLines === 0) return 0;
    const linesDone = this.blocks.slice(0, this.blockIndex).reduce((sum, b) => sum + b.lines.length, 0) + this.lineIndex;
    return Math.min(1, linesDone / totalLines);
  }

  private currentLine(): string {
    return this.blocks[this.blockIndex]!.lines[this.lineIndex]!.text;
  }

  private recomputeError(): void {
    const target = this.currentLine();
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] !== target[i]) {
        this.errorIndex = i;
        return;
      }
    }
    this.errorIndex = null;
  }

  private submit(): void {
    if (this.buffer !== this.currentLine()) {
      this.damage(this.num('submitPenalty', 0.05), 'Linha incorreta submetida');
      return;
    }
    this.reward(100);
    this.advanceLine();
  }

  private advanceLine(): void {
    const block = this.blocks[this.blockIndex]!;
    if (this.lineIndex + 1 < block.lines.length) {
      this.lineIndex += 1;
    } else if (this.blockIndex + 1 < this.blocks.length) {
      this.blockIndex += 1;
      this.lineIndex = 0;
    } else {
      this.resolve('blocked');
      return;
    }
    this.buffer = '';
    this.errorIndex = null;
  }
}
