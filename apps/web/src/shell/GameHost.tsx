import { getMinigame, type DifficultyLevel, type DifficultyParams, type MinigameId, type RunResult } from '@hub/game-core';
import { useMinigameSession } from '../game/useMinigameSession.js';
import { rendererFor } from '../game/renderers/index.js';
import { Meter } from '../ui/Meter.js';
import { Legend } from '../ui/Legend.js';
import { InputHint } from '../ui/InputHint.js';
import { ArmingOverlay } from './ArmingOverlay.js';

interface GameHostProps {
  id: MinigameId;
  seed: number;
  level: DifficultyLevel;
  difficulty?: DifficultyParams;
  mode: 'solo' | 'survival';
  streak: number;
  /** IDs elegíveis para encadeamento em caso de invasão (ex.: Zonewall no modo Sobrevivência). */
  chainPool?: MinigameId[];
  onResolved: (result: RunResult) => void;
  onAbort: () => void;
}

/**
 * Casca de partida: HUD, penalidade visual e o renderer do minigame. Não conhece
 * a mecânica de nenhum jogo — só o contrato do controller.
 */
export function GameHost({ id, seed, level, difficulty, mode, streak, chainPool, onResolved, onAbort }: GameHostProps) {
  const entry = getMinigame(id);
  const { controller, snapshot, sendInput, shakeKey } = useMinigameSession({
    id,
    seed,
    level,
    difficulty,
    chainPool,
    onResolved,
  });
  const Renderer = rendererFor(id);
  const arming = snapshot.phase === 'arming';
  // A ajuda visível some a partir do nível 3 — a remoção faz parte da escala de dificuldade.
  const showHelp = level <= 2;

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

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div key={shakeKey} className="scanlines relative animate-shake">
            {arming && <ArmingOverlay entry={entry} level={level} armingMsLeft={snapshot.armingMsLeft} />}
            <Renderer controller={controller} snapshot={snapshot} sendInput={sendInput} level={level} />
          </div>
          {showHelp && !arming && <InputHint entry={entry} snapshot={snapshot} />}
        </div>
        {showHelp && <Legend entry={entry} />}
      </div>

      {/* Nos níveis 1-2 o InputHint já mostra os controles; aqui só duplicaria. */}
      {!showHelp && (
        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.25em] text-muted">
          {entry.controls}
        </p>
      )}
    </main>
  );
}
