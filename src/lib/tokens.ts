export const colors = {
  // Player / Primary
  playerCore: '#FFFFFF',
  playerGlow: '#00FFFF',
  playerTrail: '#00CCFF',
  playerThrust: '#0088FF',
  primaryAction: '#FF006E',
  primaryAccent: '#00F0FF',

  // Enemies / Secondary
  enemyPrimary: '#FF0044',
  enemySecondary: '#FF2A6D',
  enemyGlow: '#FF6600',
  enemyProjectile: '#FF4500',
  playerProjectile: '#00CCFF',
  bossPrimary: '#B300FF',
  bossGlow: '#7B00FF',

  // Power-ups / Accent
  powerupShield: '#00E5FF',
  powerupWeapon: '#39FF14',
  powerupHealth: '#05FFA1',
  powerupScore: '#FFD600',
  powerupBomb: '#FF5500',
  rewardCore: '#00FF00',
  rewardGlow: '#88FF88',
  specialExplosion: '#FF00FF',
  gridAccent: '#20E3B2',

  // Backgrounds
  voidDeep: '#050A1A',
  voidMid: '#0A1428',
  voidSurface: '#0D0E14',
  nebulaPurple: '#12002A',
  nebulaBlue: '#1B1464',
  crtBackground: '#0A0A14',
  cabinetBase: '#181A25',

  // UI
  textPrimary: '#F0F8FF',
  textSecondary: '#B0B8C8',
  textMuted: '#6A7080',
  textNeon: '#00FFFF',
  hudBorder: '#0088FF',
  btnPrimary: '#FF006E',
  btnSecondary: '#00F0FF',
  inputBg: '#12141D',
  cardBg: '#1F2230',
  borderDefault: '#2A2D3A',

  // Health States
  healthFull: '#00FF00',
  healthMid: '#FFD600',
  healthCritical: '#FF0044',
} as const;

export const glows = {
  cyan: '0 0 4px #FFFFFF, 0 0 8px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF',
  pink: '0 0 4px #FFFFFF, 0 0 8px #FF006E, 0 0 20px #FF006E, 0 0 40px #FF006E',
  green: '0 0 4px #FFFFFF, 0 0 8px #39FF14, 0 0 20px #39FF14, 0 0 40px #39FF14',
  purple: '0 0 4px #FFFFFF, 0 0 8px #B300FF, 0 0 20px #B300FF, 0 0 40px #B300FF',
  gold: '0 0 4px #FFFFFF, 0 0 8px #FFD600, 0 0 20px #FFD600, 0 0 40px #FFD600',
} as const;

export const fonts = {
  title: "'Orbitron', sans-serif",
  score: "'Press Start 2P', cursive",
  hud: "'Electrolize', sans-serif",
  body: "'Exo 2', sans-serif",
  mono: "'VT323', monospace",
} as const;

export const gradients = {
  deepSpace: 'linear-gradient(180deg, #050A1A 0%, #0A1428 60%, #1A2840 100%)',
  nebula: 'radial-gradient(ellipse at 78% 12%, rgba(18, 0, 42, 0.55), transparent 55%), radial-gradient(ellipse at 18% 92%, rgba(10, 20, 60, 0.50), transparent 58%), linear-gradient(180deg, #050A1A, #0D0E14)',
  synthwave: 'linear-gradient(to bottom, #FF6B35, #FF1493, #2D1B69, #0A0A2E)',
  crtGlow: 'radial-gradient(ellipse at 50% 40%, rgba(0, 240, 255, 0.08), transparent 60%), #0A0A14',
  darkWave: 'linear-gradient(135deg, #12002A, #0D0E14, #1B1464)',
} as const;
