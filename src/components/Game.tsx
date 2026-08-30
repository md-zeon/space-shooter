'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '@/game/engine';
import { CONFIG } from '@/game/config';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [shootMode, setShootMode] = useState<'auto' | 'manual'>('auto');

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gameRatio = CONFIG.WIDTH / CONFIG.HEIGHT;
    const viewportRatio = vw / vh;

    let width: number;
    let height: number;

    if (viewportRatio > gameRatio) {
      // Viewport is wider — fit to height
      height = vh;
      width = height * gameRatio;
    } else {
      // Viewport is taller — fit to width
      width = vw;
      height = width / gameRatio;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engine.init(canvasRef.current);
    engineRef.current = engine;

    setShootMode(engine.getShootMode());
    updateCanvasSize();

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [updateCanvasSize]);

  const handleToggleShootMode = () => {
    if (engineRef.current) {
      const newMode = engineRef.current.toggleShootMode();
      setShootMode(newMode);
    }
  };

  const handleBomb = () => {
    engineRef.current?.pressBomb();
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#050A1A] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block"
        width={CONFIG.WIDTH}
        height={CONFIG.HEIGHT}
        style={{ touchAction: 'none' }}
      />
      <button
        onClick={handleToggleShootMode}
        className="absolute bottom-4 right-4 w-8 h-8 flex items-center justify-center 
                   text-[10px] font-mono text-[#6A7080] border border-[#2A2D3A] 
                   hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors rounded"
        title={shootMode === 'auto' ? 'Auto fire' : 'Manual fire'}
      >
        {shootMode === 'auto' ? 'A' : 'M'}
      </button>
      <button
        onClick={handleBomb}
        className="absolute bottom-16 right-4 w-8 h-8 flex items-center justify-center 
                   text-[10px] font-mono text-[#FF8C00] border border-[#FF8C00]/40 
                   hover:border-[#FF8C00] hover:bg-[#FF8C00]/10 transition-colors rounded"
        title="Bomb"
      >
        B
      </button>
    </div>
  );
}
