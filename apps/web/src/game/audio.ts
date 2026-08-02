import type { FeedbackEvent } from '@hub/game-core';

/**
 * Feedback sonoro sintetizado em runtime (Web Audio): sem assets binários no
 * repositório e sem peso extra na imagem do container.
 */
let ctx: AudioContext | null = null;

const context = (): AudioContext => {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const blip = (freq: number, durationMs: number, type: OscillatorType, gain: number): void => {
  const audio = context();
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  amp.gain.setValueAtTime(gain, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + durationMs / 1000);
  osc.connect(amp).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + durationMs / 1000);
};

export function playFeedback(event: FeedbackEvent): void {
  try {
    if (event.kind === 'hit') blip(880, 90, 'square', 0.06);
    else if (event.kind === 'miss') blip(120, 220, 'sawtooth', 0.09);
    else if (event.outcome === 'blocked') blip(1320, 260, 'triangle', 0.07);
    else blip(70, 600, 'sawtooth', 0.12);
  } catch {
    // Áudio bloqueado pelo navegador antes da primeira interação: silêncio é aceitável.
  }
}
