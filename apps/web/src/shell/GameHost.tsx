import { getMinigame, type DifficultyParams, type MinigameId, type RunResult } from '@hub/game-core';
import { useMinigameSession } from '../game/useMinigameSession.js';
import { rendererFor } from '../game/renderers/index.js';
import { Meter } from '../ui/Meter.js';

interface GameHostProps {
  id: MinigameId;
  seed: number;
  difficulty?: DifficultyParams;
  mode: 'solo' | 'survival';
  streak: number;
  onResolved: (result: RunResult) => void;
  onAbort: () => void;
}

/**
 * Casca de partida: HUD, penalidade visual e o renderer do minigame. Não conhece
 * a mecânica de nenhum jogo — só o contrato do controller.
 */
export function GameHost({ id, seed, difficulty, mode, streak, onResolved, onAbort }: GameHostProps) {
  const entry = getMinigame(id);
  const { controller, snapshot, sendInput, shakeKey } = useMinigameSession({
    id,
    seed,
    difficulty,
    onResolved,
  });
  const Renderer = rendererFor(id);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-display text-xl tracking-wide text-ink">{entry.label}</h1>
          <p className="text-xs text-muted">{entry.brief}</p>
        </div>
        <div className="text-right">
          {mode === 'survival' && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-phosphor">
              sobrevivência · {streak} bloqueios
            </p>
          )}
          <button
            type="button"
            onClick={onAbort}
            className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted hover:text-ink"
          >
            abortar (Esc)
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Meter label="Bloqueio" value={snapshot.progress} tone="safe" />
        <Meter
          label="Saúde da conexão"
          value={snapshot.integrity}
          tone={snapshot.integrity < 0.4 ? 'threat' : 'phosphor'}
        />
      </div>

      <div key={shakeKey} className="scanlines relative mt-8 animate-shake">
        <Renderer controller={controller} snapshot={snapshot} sendInput={sendInput} />
      </div>

      <p className="mt-4 text-center text-[11px] uppercase tracking-[0.25em] text-muted">
        {entry.controls}
      </p>
    </main>
  );
}
