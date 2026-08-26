'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/engine';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [shootMode, setShootMode] = useState<'auto' | 'manual'>('auto');

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engine.init(canvasRef.current);
    engineRef.current = engine;

    setShootMode(engine.getShootMode());

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleToggleShootMode = () => {
    if (engineRef.current) {
      const newMode = engineRef.current.toggleShootMode();
      setShootMode(newMode);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050A1A] relative">
      <canvas
        ref={canvasRef}
        className="block max-w-full max-h-screen"
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
    </div>
  );
}
