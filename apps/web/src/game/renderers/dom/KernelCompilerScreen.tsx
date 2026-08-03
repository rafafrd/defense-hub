import { useEffect } from 'react';
import type { KernelCompilerState } from '@hub/game-core';
import type { RendererProps } from '../types.js';

const KEY_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const formatTime = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Espaço vira ponto médio — sem isso ninguém enxerga onde digitar um espaço. */
const glyphFor = (ch: string): string => (ch === ' ' ? '·' : ch);

function VirtualKeyboard({ nextChar }: { nextChar: string | undefined }) {
  const target = nextChar?.toLowerCase();
  return (
    <div className="flex flex-col items-center gap-1">
      {KEY_ROWS.map((row) => (
        <div key={row} className="flex gap-1">
          {row.split('').map((k) => (
            <span
              key={k}
              className={[
                'flex h-7 w-7 items-center justify-center rounded border text-[11px] uppercase transition-colors duration-75',
                k === target ? 'border-phosphor bg-phosphor/25 text-phosphor' : 'border-line text-muted',
              ].join(' ')}
            >
              {k}
            </span>
          ))}
        </div>
      ))}
      <span
        className={[
          'mt-1 flex h-7 w-44 items-center justify-center rounded border text-[10px] uppercase tracking-widest transition-colors duration-75',
          nextChar === ' ' ? 'border-phosphor bg-phosphor/25 text-phosphor' : 'border-line text-muted',
        ].join(' ')}
      >
        espaço
      </span>
    </div>
  );
}

export function KernelCompilerScreen({ sendInput, snapshot, level }: RendererProps) {
  const state = snapshot.state as KernelCompilerState;
  const showKeyboard = level <= 2;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'Backspace') {
        event.preventDefault();
        sendInput({ type: 'key', code: 'Backspace' });
        return;
      }
      if (event.code === 'Enter') {
        event.preventDefault();
        sendInput({ type: 'key', code: 'Enter' });
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        sendInput({ type: 'key', code: event.code, char: event.key });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendInput]);

  const block = state.blocks[state.blockIndex]!;
  const targetLine = block.lines[state.lineIndex]!.text;
  const nextChar = targetLine[state.buffer.length];

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className="text-phosphor">blocos restantes {state.blocksRemaining}</span>
        {state.timeLimitMs > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className={state.timeLeftMs < 8_000 ? 'text-threat' : ''}>tempo {formatTime(state.timeLeftMs)}</span>
          </>
        )}
      </p>

      <div className="w-full max-w-xl border border-line bg-panel p-4 font-mono">
        {block.lines.slice(0, state.lineIndex).map((cl, i) => (
          <p key={i} className="truncate text-sm text-safe/70">
            ✓ {cl.text}
          </p>
        ))}

        <div className="my-2 border-t border-dashed border-line" />

        <p className="text-sm tracking-wide">
          {targetLine.split('').map((ch, i) => {
            let cls = 'text-muted/60';
            if (i < state.buffer.length) cls = i === state.errorIndex ? 'text-threat bg-threat/20' : 'text-safe';
            else if (i === state.buffer.length) cls = 'border-b-2 border-phosphor text-ink animate-pulse';
            return (
              <span key={i} className={['inline-block w-[0.65em] text-center', ch === ' ' ? 'opacity-40' : '', cls].join(' ')}>
                {glyphFor(ch)}
              </span>
            );
          })}
        </p>

        <p className="mt-1 text-sm tracking-wide text-muted">
          {state.buffer.split('').map((ch, i) => (
            <span
              key={i}
              className={[
                'inline-block w-[0.65em] text-center',
                ch === ' ' ? 'opacity-40' : '',
                i === state.errorIndex ? 'text-threat bg-threat/20 animate-shake' : 'text-ink',
              ].join(' ')}
            >
              {glyphFor(ch)}
            </span>
          ))}
          <span className="inline-block w-[0.65em] border-b-2 border-phosphor animate-pulse">&nbsp;</span>
        </p>

        {block.lines.slice(state.lineIndex + 1).map((cl, i) => (
          <p key={i} className="truncate text-sm text-muted/30">
            · {cl.text}
          </p>
        ))}
      </div>

      {showKeyboard && <VirtualKeyboard nextChar={nextChar} />}

      <p className="text-[11px] text-muted">Digite exatamente a linha destacada e aperte Enter para submeter.</p>
    </div>
  );
}
