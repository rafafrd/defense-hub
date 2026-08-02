import { useCallback, useEffect, useState } from 'react';
import {
  playableMinigames,
  randomSeed,
  Rng,
  type DifficultyLevel,
  type MinigameId,
  type RunResult,
} from '@hub/game-core';
import { MainMenu } from './shell/MainMenu.js';
import { GameHost } from './shell/GameHost.js';
import { ResultScreen } from './shell/ResultScreen.js';

type Mode = 'solo' | 'survival';

type Screen =
  | { kind: 'menu' }
  | {
      kind: 'playing';
      id: MinigameId;
      seed: number;
      mode: Mode;
      streak: number;
      /** Nível desta rotina específica; usado só quando o Zonewall encadeia num hack secundário +1. */
      levelOverride?: DifficultyLevel;
    }
  | { kind: 'result'; result: RunResult; mode: Mode; streak: number };

/**
 * Máquina de estados do hub: menu -> partida -> resultado -> menu.
 * No modo Sobrevivência, um bloqueio emenda direto na próxima rotina sorteada;
 * uma invasão encerra a sessão e cai na tela de resultado.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [bestStreak, setBestStreak] = useState<number | null>(null);
  // Nível escolhido no menu; persiste enquanto o app estiver aberto, inclusive entre partidas da Sobrevivência.
  const [level, setLevel] = useState<DifficultyLevel>(3);

  const startGame = useCallback((id: MinigameId, mode: Mode, streak = 0) => {
    setScreen({ kind: 'playing', id, seed: randomSeed(), mode, streak });
  }, []);

  const startSurvival = useCallback(() => {
    const pool = playableMinigames();
    const next = new Rng(randomSeed()).pick(pool);
    startGame(next.id, 'survival', 0);
  }, [startGame]);

  const handleResolved = useCallback(
    (result: RunResult) => {
      setScreen((current) => {
        if (current.kind !== 'playing') return current;

        if (current.mode === 'survival' && result.outcome === 'blocked') {
          const streak = current.streak + 1;
          setBestStreak((best) => (best === null || streak > best ? streak : best));
          const pool = playableMinigames().filter((m) => m.id !== current.id);
          const next = new Rng(randomSeed()).pick(pool.length > 0 ? pool : playableMinigames());
          return { kind: 'playing', id: next.id, seed: randomSeed(), mode: 'survival', streak };
        }

        // No Zonewall, uma invasão pode encadear um hack secundário em nível +1
        // em vez de encerrar a sessão de Sobrevivência.
        if (current.mode === 'survival' && result.outcome === 'breached' && result.chainTo) {
          return {
            kind: 'playing',
            id: result.chainTo,
            seed: randomSeed(),
            mode: 'survival',
            streak: current.streak,
            levelOverride: Math.min(5, level + 1) as DifficultyLevel,
          };
        }

        return { kind: 'result', result, mode: current.mode, streak: current.streak };
      });
    },
    [level],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setScreen({ kind: 'menu' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (screen.kind === 'playing') {
    // No modo Sobrevivência, qualquer rotina pode encadear para outra em caso de
    // invasão (hoje só o Zonewall usa isso) — o pool nunca inclui a rotina atual.
    const chainPool =
      screen.mode === 'survival'
        ? playableMinigames().filter((m) => m.id !== screen.id).map((m) => m.id)
        : undefined;

    return (
      <GameHost
        key={`${screen.id}-${screen.seed}`}
        id={screen.id}
        seed={screen.seed}
        level={screen.levelOverride ?? level}
        mode={screen.mode}
        streak={screen.streak}
        chainPool={chainPool}
        onResolved={handleResolved}
        onAbort={() => setScreen({ kind: 'menu' })}
      />
    );
  }

  if (screen.kind === 'result') {
    return (
      <ResultScreen
        result={screen.result}
        mode={screen.mode}
        streak={screen.streak}
        onRetry={() =>
          screen.mode === 'survival' ? startSurvival() : startGame(screen.result.minigameId, 'solo')
        }
        onMenu={() => setScreen({ kind: 'menu' })}
      />
    );
  }

  return (
    <MainMenu
      bestStreak={bestStreak}
      level={level}
      onLevelChange={setLevel}
      onLaunch={(id) => startGame(id, 'solo')}
      onSurvival={startSurvival}
    />
  );
}
