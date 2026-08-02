import type { PendingState } from '@hub/game-core';
import type { RendererProps } from '../types.js';

/** Placeholder honesto: mostra as regras do GDD que faltam implementar. */
export function PendingBoard({ snapshot }: RendererProps) {
  const state = snapshot.state as PendingState;
  return (
    <div className="mx-auto max-w-xl border border-dashed border-line bg-panel p-6">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-phosphor">
        Módulo não implementado
      </p>
      <p className="mt-2 text-sm text-muted">
        A mecânica está especificada e o controller já existe no registry. Falta escrever a regra:
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink">
        {state.spec.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span className="text-phosphor">›</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
