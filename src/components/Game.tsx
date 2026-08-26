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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050A1A]">
      <canvas
        ref={canvasRef}
        className="block max-w-full max-h-[85vh]"
        style={{ touchAction: 'none' }}
      />
      <div className="mt-4 flex gap-4 items-center">
        <button
          onClick={handleToggleShootMode}
          className="px-4 py-2 text-sm font-mono text-[#00FFFF] border border-[#00FFFF] 
                     hover:bg-[#00FFFF]/20 transition-colors rounded"
          style={{
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
          }}
        >
          FIRE: {shootMode === 'auto' ? 'AUTO' : 'MANUAL'}
        </button>
        <span className="text-[#6A7080] text-xs font-mono">
          {shootMode === 'auto' ? 'Hold to shoot' : 'Tap to shoot'}
        </span>
      </div>
    </div>
  );
}
