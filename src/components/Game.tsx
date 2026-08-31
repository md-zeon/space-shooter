'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '@/game/engine';
import { CONFIG } from '@/game/config';

/** Read a CSS safe-area env() inset (px) with graceful fallback to 0. */
function safeInset(edge: 'top' | 'right' | 'bottom' | 'left'): number {
  if (typeof window === 'undefined' || !window.CSS?.supports) return 0;
  if (!window.CSS.supports('padding', `env(safe-area-inset-${edge})`)) return 0;
  const probe = document.createElement('div');
  probe.style.paddingTop = 'env(safe-area-inset-top)';
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
  probe.style.paddingLeft = 'env(safe-area-inset-left)';
  probe.style.paddingRight = 'env(safe-area-inset-right)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const map: Record<string, string> = {
    top: cs.paddingTop,
    right: cs.paddingRight,
    bottom: cs.paddingBottom,
    left: cs.paddingLeft,
  };
  document.body.removeChild(probe);
  return parseFloat(map[edge] || '0') || 0;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [shootMode, setShootMode] = useState<'auto' | 'manual'>('auto');

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect the mobile safe areas (notch / home indicator). With
    // `viewport-fit=cover` these insets are non-zero on notched devices, so the
    // play area pads inside them rather than colliding with system UI.
    const safeTop = safeInset('top');
    const safeBottom = safeInset('bottom');
    const safeLeft = safeInset('left');
    const safeRight = safeInset('right');

    const availW = Math.max(1, window.innerWidth - safeLeft - safeRight);
    const availH = Math.max(1, window.innerHeight - safeTop - safeBottom);
    const gameRatio = CONFIG.WIDTH / CONFIG.HEIGHT;
    const availRatio = availW / availH;

    let width: number;
    let height: number;

    // Fill the available safe area, centered; never letterbox the mobile field.
    if (availRatio > gameRatio) {
      // Viewport is wider — fit to height.
      height = availH;
      width = height * gameRatio;
    } else {
      // Viewport is taller — fit to width.
      width = availW;
      height = width / gameRatio;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Reposition the canvas so it stays centered within the safe area
    // (tighten the flex centering with the insets).
    const host = canvas.parentElement;
    if (host) {
      host.style.paddingTop = `${safeTop}px`;
      host.style.paddingBottom = `${safeBottom}px`;
    }
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

  const handleSpecial = () => {
    engineRef.current?.pressSpecial();
  };

  const handleFocusDown = () => {
    engineRef.current?.setFocus(true);
  };

  const handleFocusUp = () => {
    engineRef.current?.setFocus(false);
  };

  return (
    <div
      className="flex items-center justify-center h-screen w-screen bg-[#050A1A] overflow-hidden"
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        width={CONFIG.WIDTH}
        height={CONFIG.HEIGHT}
        style={{ touchAction: 'none' }}
      />
      <div className="absolute left-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
        <button
          onPointerDown={handleFocusDown}
          onPointerUp={handleFocusUp}
          onPointerLeave={handleFocusUp}
          onContextMenu={(e) => e.preventDefault()}
          className="w-14 h-14 flex items-center justify-center 
                     text-[10px] font-mono text-[#FF0044] border border-[#FF0044]/50 
                     active:bg-[#FF0044]/15 select-none rounded-full"
          title="Focus (hold): slow movement + reveal hitbox"
        >
          FOCUS
        </button>
      </div>
      <div className="absolute right-3 flex flex-col items-end gap-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <button
          onClick={handleToggleShootMode}
          className="w-8 h-8 flex items-center justify-center 
                     text-[10px] font-mono text-[#6A7080] border border-[#2A2D3A] 
                     hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors rounded"
          title={shootMode === 'auto' ? 'Auto fire' : 'Manual fire'}
        >
          {shootMode === 'auto' ? 'A' : 'M'}
        </button>
        <button
          onClick={handleSpecial}
          className="w-11 h-11 flex items-center justify-center 
                     text-[10px] font-mono text-[#00FFFF] border border-[#00FFFF]/40 
                     hover:border-[#00FFFF] hover:bg-[#00FFFF]/10 transition-colors rounded-full"
          title="Special (max power laser)"
        >
          ✷
        </button>
        <button
          onClick={handleBomb}
          className="w-8 h-8 flex items-center justify-center 
                     text-[10px] font-mono text-[#FF8C00] border border-[#FF8C00]/40 
                     hover:border-[#FF8C00] hover:bg-[#FF8C00]/10 transition-colors rounded"
          title="Bomb"
        >
          B
        </button>
      </div>
    </div>
  );
}
