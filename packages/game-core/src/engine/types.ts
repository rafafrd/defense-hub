/**
 * Contratos compartilhados do núcleo de jogo.
 * Nada aqui importa DOM, React ou Canvas: o pacote é framework-agnostic para que
 * a regra de negócio de cada minigame seja testável em Node puro.
 */
import type { DifficultyLevel } from './difficulty.js';

export type MinigameId =
  | 'zonewall'
  | 'memdefrager'
  | 'nodehexer'
  | 'kernelcompiler'
  | 'memdeallocater'
  | 'shiftseq'
  | 'stackpusher'
  | 'tokenine';

/** Como a camada de apresentação desenha o minigame. */
export type RendererKind = 'canvas' | 'dom';

export type Phase = 'idle' | 'arming' | 'running' | 'blocked' | 'breached';

/** Resultado binário exigido pelo GDD: ataque bloqueado ou sistema invadido. */
export type Outcome = 'blocked' | 'breached';

export interface PointerInput {
  type: 'pointer';
  /** Coordenadas normalizadas 0..1 relativas à área de jogo. */
  x: number;
  y: number;
  /** Alvo lógico, usado pelos minigames de grade (renderer DOM). */
  targetId?: string;
}

export interface KeyInput {
  type: 'key';
  /** KeyboardEvent.code: 'Space', 'ArrowLeft', 'KeyW', 'Backspace', 'Enter'... */
  code: string;
  /** Caractere digitado, usado pelo K3RN3LC0MP1L3R. */
  char?: string;
}

/** União "crua" de inputs, sem o carimbo de tempo — usada pelos renderers ao emitir eventos. */
export type GameInputPayload = PointerInput | KeyInput;

export type GameInput = GameInputPayload & { at: number };

export interface TickContext {
  /** Delta fixo em ms (o loop roda em timestep determinístico). */
  dt: number;
  /** Tempo desde start() em ms. */
  elapsed: number;
}

/** Eventos de feedback consumidos por áudio e efeitos visuais. */
export type FeedbackEvent =
  | { kind: 'hit'; intensity?: number }
  | { kind: 'miss'; intensity?: number }
  | { kind: 'resolved'; outcome: Outcome; reason?: string };

export interface DifficultyParams {
  [key: string]: number | boolean | string;
}

export interface MinigameConfig {
  /** Semente da run: mesma seed reproduz o mesmo desafio (replay e validação). */
  seed: number;
  difficulty: DifficultyParams;
  level: DifficultyLevel;
}

/** Estado público lido pelo renderer a cada frame. */
export interface Snapshot<TState> {
  phase: Phase;
  /** 0..1 do objetivo cumprido. */
  progress: number;
  /** 0..1 da saúde da conexão; zero significa invasão. */
  integrity: number;
  elapsed: number;
  /** ms restantes da contagem regressiva de arming; 0 fora dela. */
  armingMsLeft: number;
  state: TState;
}

export interface RunResult {
  minigameId: MinigameId;
  outcome: Outcome;
  score: number;
  durationMs: number;
  seed: number;
  reason?: string;
}
