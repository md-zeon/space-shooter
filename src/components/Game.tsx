'use client';

import { useEffect, useRef } from 'react';
import { GameEngine } from '@/game/engine';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engine.init(canvasRef.current);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050A1A]">
      <canvas
        ref={canvasRef}
        className="block max-w-full max-h-screen"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
