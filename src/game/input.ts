export class InputManager {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchCurrentX: number = 0;
  private touchCurrentY: number = 0;
  private isTouching: boolean = false;
  private isShooting: boolean = false;
  private wasShooting: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private shootMode: 'auto' | 'manual' = 'auto';

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    if (this.canvas) {
      this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
      this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.keys.has(e.key)) {
      this.keysJustPressed.add(e.key);
    }
    this.keys.add(e.key);
    if (e.key === ' ') e.preventDefault();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
    this.keysJustPressed.delete(e.key);
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    this.touchStartX = touch.clientX - rect.left;
    this.touchStartY = touch.clientY - rect.top;
    this.touchCurrentX = this.touchStartX;
    this.touchCurrentY = this.touchStartY;
    this.isTouching = true;

    // Right 60% = shoot zone
    const relX = this.touchStartX / rect.width;
    if (relX > 0.4) {
      this.wasShooting = false;
      this.isShooting = true;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isTouching) return;

    const touch = e.touches[0];
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    this.touchCurrentX = touch.clientX - rect.left;
    this.touchCurrentY = touch.clientY - rect.top;
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.isTouching = false;
    this.isShooting = false;
  };

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }

  isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key);
  }

  clearJustPressed() {
    this.keysJustPressed.clear();
  }

  setShootMode(mode: 'auto' | 'manual') {
    this.shootMode = mode;
  }

  getShootMode(): 'auto' | 'manual' {
    return this.shootMode;
  }

  isShootingActive(): boolean {
    if (this.shootMode === 'auto') {
      return true;
    } else {
      return this.keys.has(' ') || this.isShooting;
    }
  }

  updateShootingState() {
    this.wasShooting = this.isShooting;
  }

  getTouchDelta(): { dx: number; dy: number } {
    if (!this.isTouching || !this.canvas) return { dx: 0, dy: 0 };

    const rect = this.canvas.getBoundingClientRect();
    const maxDelta = 30;

    const dx = (this.touchCurrentX - this.touchStartX) / maxDelta;
    const dy = (this.touchCurrentY - this.touchStartY) / maxDelta;

    return {
      dx: Math.max(-1, Math.min(1, dx)),
      dy: Math.max(-1, Math.min(1, dy)),
    };
  }
}
