export interface ClickEvent {
  x: number;
  y: number;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private isShooting: boolean = false;
  private wasShooting: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private shootMode: 'auto' | 'manual' = 'auto';

  private pendingClick: ClickEvent | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private hasMouse: boolean = false;
  private backButtonConsumed: boolean = true;

  // Touch position tracking (direct follow with offset)
  private touchX: number = 0;
  private touchY: number = 0;
  private touchOffsetX: number = 0;
  private touchOffsetY: number = 0;
  private _isTouching: boolean = false;
  private touchInitialized: boolean = false;

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

  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.toCanvasCoords(touch.clientX, touch.clientY);

    this.touchX = pos.x;
    this.touchY = pos.y;

    if (!this.touchInitialized) {
      this.touchOffsetX = 0;
      this.touchOffsetY = 0;
      this.touchInitialized = true;
    }

    this._isTouching = true;

    // Register as click for menu interaction
    this.pendingClick = { x: pos.x, y: pos.y };

    // Always shooting during touch (auto-fire handles it)
    this.wasShooting = false;
    this.isShooting = true;
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this._isTouching) return;

    const touch = e.touches[0];
    const pos = this.toCanvasCoords(touch.clientX, touch.clientY);
    this.touchX = pos.x;
    this.touchY = pos.y;
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this._isTouching = false;
    this.isShooting = false;
    this.touchInitialized = false;
  };

  // Called by engine to set the offset at the moment touch starts
  // offset = shipCenter - fingerPosition
  setTouchOffset(shipCenterX: number, shipCenterY: number) {
    this.touchOffsetX = shipCenterX - this.touchX;
    this.touchOffsetY = shipCenterY - this.touchY;
  }

  isTouching(): boolean {
    return this._isTouching;
  }

  // Returns the target position the ship should move toward (in canvas coords)
  getTouchTarget(): { x: number; y: number } | null {
    if (!this._isTouching) return null;
    return {
      x: this.touchX + this.touchOffsetX,
      y: this.touchY + this.touchOffsetY,
    };
  }

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
}
