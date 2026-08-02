import type { MinigameEntry, Snapshot } from '@hub/game-core';

interface InputHintProps {
  entry: MinigameEntry;
  snapshot: Snapshot<unknown>;
}

/**
 * Mostra a ação esperada agora: os controles do minigame e o passo do "como
 * jogar" mais próximo do progresso atual. Só aparece nos níveis 1 e 2 — do
 * nível 3 pra cima a ajuda some de propósito.
 */
export function InputHint({ entry, snapshot }: InputHintProps) {
  const stepIndex = Math.min(
    entry.howTo.length - 1,
    Math.floor(snapshot.progress * entry.howTo.length),
  );
  const hint = entry.howTo[stepIndex] ?? entry.controls;

  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-2 border border-line bg-panel px-3 py-2 text-center text-xs text-ink">
      <span className="font-display uppercase tracking-[0.2em] text-phosphor">{entry.controls}</span>
      <span className="text-muted">·</span>
      <span>{hint}</span>
    </p>
  );
}
