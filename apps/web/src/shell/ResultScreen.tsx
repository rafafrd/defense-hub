import { getMinigame, type RunResult } from '@hub/game-core';
import { AsciiSkull } from '../ui/AsciiSkull.js';

interface ResultScreenProps {
  result: RunResult;
  mode: 'solo' | 'survival';
  streak: number;
  onRetry: () => void;
  onMenu: () => void;
}

export function ResultScreen({ result, mode, streak, onRetry, onMenu }: ResultScreenProps) {
  const breached = result.outcome === 'breached';
  const entry = getMinigame(result.minigameId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center">
      {breached && <AsciiSkull />}

      <h1
        className={`mt-6 font-display text-2xl uppercase tracking-[0.2em] ${breached ? 'text-threat' : 'text-safe'}`}
      >
        {breached ? 'Sistema invadido' : 'Ataque bloqueado'}
      </h1>

      <p className="mt-3 text-sm text-muted">
        {breached
          ? (result.reason ?? `A rotina ${entry.label} caiu antes da contenção.`)
          : `${entry.label} contido em ${(result.durationMs / 1000).toFixed(1)}s.`}
      </p>

      {mode === 'survival' && (
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-phosphor">
          sequência encerrada em {streak} {streak === 1 ? 'bloqueio' : 'bloqueios'}
        </p>
      )}

      <dl className="mt-8 grid w-full grid-cols-3 gap-px border border-line bg-line text-xs">
        {[
          ['pontos', String(result.score)],
          ['tempo', `${(result.durationMs / 1000).toFixed(1)}s`],
          ['seed', result.seed.toString(16).slice(0, 8)],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-4">
            <dt className="uppercase tracking-[0.2em] text-muted">{label}</dt>
            <dd className="mt-1 font-display text-lg text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="border border-line px-5 py-2 font-display text-sm uppercase tracking-[0.2em] text-ink hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor"
        >
          Tentar de novo
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="border border-phosphor bg-phosphor px-5 py-2 font-display text-sm uppercase tracking-[0.2em] text-void hover:bg-phosphor/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor"
        >
          Voltar ao menu
        </button>
      </div>
    </main>
  );
}
