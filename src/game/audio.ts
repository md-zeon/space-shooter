export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted: boolean = false;

  init() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain.gain.value = 0.3;
      this.musicGain.gain.value = 0.15;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    gain: number = 0.3,
    startTime: number = 0
  ) {
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime + startTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(frequency * 0.3, 20),
      this.ctx.currentTime + startTime + duration
    );

    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  private playNoise(duration: number, gain: number = 0.2, startTime: number = 0) {
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    source.connect(gainNode);
    gainNode.connect(this.sfxGain);

    source.start(this.ctx.currentTime + startTime);
  }

  playShoot() {
    this.playTone(880, 0.1, 'square', 0.2);
    this.playTone(1320, 0.05, 'square', 0.1);
  }

  playExplosion() {
    this.playNoise(0.3, 0.3);
    this.playTone(100, 0.3, 'sawtooth', 0.2);
  }

  playExplosionSmall() {
    this.playNoise(0.15, 0.2);
    this.playTone(200, 0.15, 'sawtooth', 0.15);
  }

  playExplosionBig() {
    this.playNoise(0.5, 0.4);
    this.playTone(60, 0.5, 'sawtooth', 0.3);
    this.playTone(40, 0.6, 'sine', 0.2, 0.1);
  }

  playPowerUp() {
    this.playTone(523, 0.1, 'sine', 0.3);
    this.playTone(659, 0.1, 'sine', 0.3, 0.05);
    this.playTone(784, 0.15, 'sine', 0.3, 0.1);
  }

  playDamage() {
    this.playTone(200, 0.2, 'sawtooth', 0.3);
    this.playNoise(0.1, 0.2);
  }

  playGameOver() {
    this.playTone(440, 0.2, 'square', 0.3);
    this.playTone(349, 0.2, 'square', 0.3, 0.2);
    this.playTone(294, 0.3, 'square', 0.3, 0.4);
  }

  playWarning() {
    for (let i = 0; i < 4; i++) {
      this.playTone(800, 0.15, 'square', 0.25, i * 0.2);
      this.playTone(600, 0.15, 'square', 0.25, i * 0.2 + 0.1);
    }
  }

  playBomb() {
    this.playNoise(0.6, 0.5);
    this.playTone(80, 0.5, 'sawtooth', 0.4);
    this.playTone(60, 0.7, 'sine', 0.3, 0.1);
  }

  playBossHit() {
    this.playTone(300, 0.08, 'square', 0.15);
  }

  playBossDeath() {
    for (let i = 0; i < 5; i++) {
      this.playNoise(0.3, 0.3, i * 0.15);
      this.playTone(100 - i * 10, 0.3, 'sawtooth', 0.2, i * 0.15);
    }
  }

  playWaveComplete() {
    this.playTone(660, 0.1, 'sine', 0.2);
    this.playTone(880, 0.15, 'sine', 0.2, 0.1);
  }

  playEnemyHit() {
    this.playTone(400, 0.05, 'square', 0.1);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 1;
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
