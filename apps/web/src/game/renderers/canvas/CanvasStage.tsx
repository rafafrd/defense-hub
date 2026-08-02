import { useEffect, useRef } from 'react';
import type { MinigameController } from '@hub/game-core';

export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  controller: MinigameController<unknown>,
  size: { width: number; height: number },
) => void;

interface CanvasStageProps {
  controller: MinigameController<unknown>;
  draw: DrawFn;
  /** Proporção do palco; a largura acompanha o container. */
  aspect?: number;
  onPointer?: (point: { x: number; y: number }) => void;
}

/**
 * Palco de canvas: cuida de DPI, resize e do rAF de desenho. Lê o controller
 * diretamente a cada frame, então o traço nunca fica atrás do estado da regra.
 */
export function CanvasStage({ controller, draw, aspect = 0.32, onPointer }: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = Math.round(width * aspect);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, controller, { width, height });
      frame = requestAnimationFrame(render);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [controller, aspect]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full cursor-crosshair border border-line bg-panel"
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onPointer?.({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        });
      }}
    />
  );
}
