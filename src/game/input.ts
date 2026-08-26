export interface ClickEvent {
  x: number;
  y: number;
}

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

  private pendingClick: ClickEvent | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private hasMouse: boolean = false;
  private backButtonConsumed: boolean = false;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('popstate', this.handlePopState);

    if (this.canvas) {
      this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
      this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
      this.canvas.addEventListener('mousedown', this.handleMouseDown);
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('popstate', this.handlePopState);

    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
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

  private handlePopState = () => {
    this.backButtonConsumed = false;
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    this.touchStartX = x;
    this.touchStartY = y;
    this.touchCurrentX = x;
    this.touchCurrentY = y;
    this.isTouching = true;

    // Register as click for menu interaction
    this.pendingClick = { x, y };

    // Right 60% = shoot zone (during gameplay) — also consume the click so it doesn't trigger pause
    const relX = touch.clientX - rect.left;
    const relWidth = rect.width;
    if (relX / relWidth > 0.4) {
      this.wasShooting = false;
      this.isShooting = true;
      this.pendingClick = null;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isTouching) return;

    const touch = e.touches[0];
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    this.touchCurrentX = (touch.clientX - rect.left) * scaleX;
    this.touchCurrentY = (touch.clientY - rect.top) * scaleY;
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.isTouching = false;
    this.isShooting = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.pendingClick = { x, y };
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
    this.hasMouse = true;
  };

  private handleMouseLeave = () => {
    this.hasMouse = false;
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

  consumeClick(): ClickEvent | null {
    const click = this.pendingClick;
    this.pendingClick = null;
    return click;
  }

  getMousePosition(): { x: number; y: number } | null {
    return this.hasMouse ? { x: this.mouseX, y: this.mouseY } : null;
  }

  consumeBackButton(): boolean {
    if (!this.backButtonConsumed) {
      this.backButtonConsumed = true;
      return true;
    }
    return false;
  }

  getTouchDelta(): { dx: number; dy: number } {
    if (!this.isTouching || !this.canvas) return { dx: 0, dy: 0 };

    const maxDelta = 30;

    const dx = (this.touchCurrentX - this.touchStartX) / maxDelta;
    const dy = (this.touchCurrentY - this.touchStartY) / maxDelta;

    return {
      dx: Math.max(-1, Math.min(1, dx)),
      dy: Math.max(-1, Math.min(1, dy)),
    };
  }
}
