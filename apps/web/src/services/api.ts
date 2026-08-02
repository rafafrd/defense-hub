import type { DifficultyParams, MinigameId, RunResult } from '@hub/game-core';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) throw new Error(`${response.status} em ${path}`);
  return (await response.json()) as T;
}

export interface Profile {
  id: string;
  handle: string;
}

export const api = {
  /** Cria o perfil se ainda não existir e devolve o registro. */
  ensureProfile: (handle: string) =>
    request<Profile>('/profiles', { method: 'POST', body: JSON.stringify({ handle }) }),

  /** Overrides de dificuldade por minigame para este perfil. */
  difficulty: (profileId: string) =>
    request<Record<MinigameId, DifficultyParams>>(`/profiles/${profileId}/difficulty`),

  saveRun: (profileId: string, run: RunResult & { mode: 'solo' | 'survival' }) =>
    request<{ id: string }>(`/profiles/${profileId}/runs`, {
      method: 'POST',
      body: JSON.stringify(run),
    }),

  history: (profileId: string) =>
    request<Array<RunResult & { id: string; createdAt: string }>>(`/profiles/${profileId}/runs`),
};
