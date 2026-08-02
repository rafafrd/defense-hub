import { LEVEL_NAMES, MINIGAMES, type DifficultyLevel, type MinigameEntry, type MinigameId } from '@hub/game-core';
import { BriefingPanel } from './BriefingPanel.js';

interface MainMenuProps {
  onLaunch: (id: MinigameId) => void;
  onSurvival: () => void;
  bestStreak: number | null;
  level: DifficultyLevel;
  onLevelChange: (level: DifficultyLevel) => void;
}

const LEVELS: DifficultyLevel[] = [1, 2, 3, 4, 5];

function LevelPicker({ level, onChange }: { level: DifficultyLevel; onChange: (level: DifficultyLevel) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted">Nível</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Nível de dificuldade">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={level === l}
            className={[
              'border px-3 py-1 font-display text-xs uppercase tracking-[0.15em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor',
              level === l
                ? 'border-phosphor bg-phosphor text-void'
                : 'border-line text-muted hover:border-ink hover:text-ink',
            ].join(' ')}
          >
            {l} · {LEVEL_NAMES[l]}
          </button>
        ))}
      </div>
    </div>
  );
}

function MinigameCard({ entry, onLaunch }: { entry: MinigameEntry; onLaunch: () => void }) {
  return (
    <div className="group relative flex flex-col gap-2 border border-line bg-panel p-4 text-left transition-colors hover:border-phosphor">
      <button
        type="button"
        onClick={onLaunch}
        className="flex flex-col gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-base tracking-wide text-ink group-hover:text-phosphor">
            {entry.label}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">{entry.group}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted">{entry.brief}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-muted">{entry.controls}</span>
          <span className={entry.implemented ? 'text-safe' : 'text-threat'}>
            {entry.implemented ? 'online' : 'pendente'}
          </span>
        </div>
      </button>
      <details className="mt-1 border-t border-line pt-2">
        <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.2em] text-muted hover:text-ink">
          Como jogar
        </summary>
        <div className="mt-3">
          <BriefingPanel entry={entry} />
        </div>
      </details>
    </div>
  );
}

export function MainMenu({ onLaunch, onSurvival, bestStreak, level, onLevelChange }: MainMenuProps) {
  const groups: Array<{ title: string; caption: string; items: MinigameEntry[] }> = [
    {
      title: 'Camada 1',
      caption: 'Contenção clássica',
      items: MINIGAMES.filter((m) => m.group === 'WTTG2'),
    },
    {
      title: 'Camada 2',
      caption: 'Contenção avançada',
      items: MINIGAMES.filter((m) => m.group === 'WTTG3'),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="border-b border-line pb-6">
        <p className="text-[11px] uppercase tracking-[0.4em] text-phosphor">console de contenção</p>
        <h1 className="mt-2 font-display text-3xl tracking-wide text-ink sm:text-4xl">
          DEFENSIVE HUB
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Oito rotinas de bloqueio. Cada uma termina em ataque bloqueado ou sistema invadido.
        </p>
        <div className="mt-4">
          <LevelPicker level={level} onChange={onLevelChange} />
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-center gap-4 border border-phosphor/40 bg-phosphor/5 p-4">
        <div className="flex-1">
          <h2 className="font-display text-lg tracking-wide text-phosphor">Modo Sobrevivência</h2>
          <p className="text-xs text-muted">
            Rotinas em sequência aleatória. Uma invasão encerra a sessão.
          </p>
        </div>
        {bestStreak !== null && (
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            recorde <span className="text-ink">{bestStreak}</span>
          </p>
        )}
        <button
          type="button"
          onClick={onSurvival}
          className="border border-phosphor px-5 py-2 font-display text-sm uppercase tracking-[0.2em] text-phosphor transition-colors hover:bg-phosphor hover:text-void focus:outline-none focus-visible:ring-2 focus-visible:ring-phosphor"
        >
          Iniciar sessão
        </button>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="mt-10">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-sm uppercase tracking-[0.3em] text-ink">{group.title}</h2>
            <span className="text-[11px] text-muted">{group.caption}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((entry) => (
              <MinigameCard key={entry.id} entry={entry} onLaunch={() => onLaunch(entry.id)} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
