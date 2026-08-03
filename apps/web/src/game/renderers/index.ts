import type { ComponentType } from 'react';
import type { MinigameId } from '@hub/game-core';
import type { RendererProps } from './types.js';
import { ZonewallRenderer } from './canvas/ZonewallRenderer.js';
import { ShiftSeqRenderer } from './canvas/ShiftSeqRenderer.js';
import { MemDefragerGrid } from './dom/MemDefragerGrid.js';
import { NodeHexerBoard } from './dom/NodeHexerBoard.js';
import { KernelCompilerScreen } from './dom/KernelCompilerScreen.js';
import { StackPusherBoard } from './dom/StackPusherBoard.js';
import { PendingBoard } from './dom/PendingBoard.js';

/**
 * Único ponto que liga um minigame à sua camada visual. Minigame novo = uma
 * entrada aqui e uma no registry do game-core; nada mais no shell muda.
 */
const RENDERERS: Partial<Record<MinigameId, ComponentType<RendererProps>>> = {
  zonewall: ZonewallRenderer,
  memdefrager: MemDefragerGrid,
  nodehexer: NodeHexerBoard,
  kernelcompiler: KernelCompilerScreen,
  shiftseq: ShiftSeqRenderer,
  stackpusher: StackPusherBoard,
};

export const rendererFor = (id: MinigameId): ComponentType<RendererProps> =>
  RENDERERS[id] ?? PendingBoard;

export type { RendererProps };
