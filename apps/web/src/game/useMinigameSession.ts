import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameLoop,
  createMinigame,
  type DifficultyLevel,
  type DifficultyParams,
  type GameInput,
  type GameInputPayload,
  type MinigameController,
  type MinigameId,
  type RunResult,
  type Snapshot,
} from '@hub/game-core';
import { playFeedback } from './audio.js';

interface SessionOptions {
  id: MinigameId;
  seed: number;
  level: DifficultyLevel;
  difficulty?: DifficultyParams;
  /** IDs elegíveis para encadeamento em caso de invasão (ex.: Zonewall no modo Sobrevivência). */
  chainPool?: MinigameId[];
  onResolved: (result: RunResult) => void;
}

/**
 * Ponte entre o controller (regra) e o React (apresentação).
 * O snapshot para o DOM é atualizado em cadência reduzida; os renderers em
 * canvas leem o controller direto no rAF, sem passar por estado do React.
 */
export function useMinigameSession({ id, seed, level, difficulty, chainPool, onResolved }: SessionOptions) {
  const controller = useMemo<MinigameController<unknown>>(
    () => createMinigame(id, seed, level, difficulty, chainPool),
    [id, seed, level, difficulty, chainPool],
  );

  const [snapshot, setSnapshot] = useState<Snapshot<unknown>>(() => controller.snapshot());
  const [shakeKey, setShakeKey] = useState(0);
  const resolvedRef = useRef(false);

  useEffect(() => {
    resolvedRef.current = false;
    let sinceSync = 0;

    const stopFeedback = controller.onFeedback((event) => {
      playFeedback(event);
      if (event.kind === 'miss') setShakeKey((n) => n + 1);
      setSnapshot(controller.snapshot());
    });

    const loop = new GameLoop(controller, {
      onFrame: ({ dt }) => {
        sinceSync += dt;
        if (sinceSync >= 50) {
          sinceSync = 0;
          setSnapshot(controller.snapshot());
        }
      },
      onResolved: () => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        setSnapshot(controller.snapshot());
        onResolved(controller.result());
      },
    });

    loop.start();
    return () => {
      stopFeedback();
      loop.stop();
    };
  }, [controller, onResolved]);

  const sendInput = useCallback(
    (input: GameInputPayload) => {
      if (controller.isOver()) return;
      controller.handleInput({ ...input, at: performance.now() } as GameInput);
      setSnapshot(controller.snapshot());
      if (controller.isOver() && !resolvedRef.current) {
        resolvedRef.current = true;
        onResolved(controller.result());
      }
    },
    [controller, onResolved],
  );

  return { controller, snapshot, sendInput, shakeKey };
}
