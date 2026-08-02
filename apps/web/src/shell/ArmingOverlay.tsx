import { LEVEL_NAMES, type DifficultyLevel, type MinigameEntry } from '@hub/game-core';
import { AsciiSkull } from '../ui/AsciiSkull.js';
import { BriefingPanel } from './BriefingPanel.js';

interface ArmingOverlayProps {
  entry: MinigameEntry;
  level: DifficultyLevel;
  armingMsLeft: number;
}

/** A caveira corrompe a tela só no primeiro segundo dos 3s de contagem regressiva. */
const SKULL_WINDOW_MS = 2000;

/**
 * Última tela antes do jogo valer: contagem 3-2-1, nome/nível do minigame e o
 * briefing curto. Cobre toda a área de jogo, então também bloqueia cliques
 * prematuros (handleInput já descarta input em arming, isso é só a UI disso).
 */
export function ArmingOverlay({ entry, level, armingMsLeft }: ArmingOverlayProps) {
  const count = Math.max(1, Math.min(3, Math.ceil(armingMsLeft / 1000)));
  const showSkull = armingMsLeft > SKULL_WINDOW_MS;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 overflow-hidden bg-void/95 px-4 py-6 text-center"
    >
      {showSkull && (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-70">
          <AsciiSkull variant="corrupt" />
        </div>
      )}

      <p className="relative font-display text-xs uppercase tracking-[0.3em] text-phosphor">
        {entry.label} · nível {level} · {LEVEL_NAMES[level]}
      </p>

      <p
        key={count}
        className="relative font-display text-6xl text-ink motion-safe:animate-skull-pulse sm:text-7xl"
      >
        {count}
      </p>

      <div className="relative flex w-full max-w-sm justify-center">
        <BriefingPanel entry={entry} variant="compact" />
      </div>
    </div>
  );
}
