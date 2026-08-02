import type { GameInputPayload, MinigameController, Snapshot } from '@hub/game-core';

export interface RendererProps {
  controller: MinigameController<unknown>;
  snapshot: Snapshot<unknown>;
  sendInput: (input: GameInputPayload) => void;
}
