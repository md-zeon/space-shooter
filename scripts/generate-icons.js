const sharp = require('sharp');
const path = require('path');

const ICON_SIZES = [192, 512];
const APPLE_TOUCH_SIZE = 180;

function createIconSVG(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const shipSize = s * 0.35;
  const glowRadius = s * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0A1628"/>
      <stop offset="100%" stop-color="#050A1A"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${s * 0.02}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="bigglow">
      <feGaussianBlur stdDeviation="${s * 0.04}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${s * 0.15}" fill="url(#bg)"/>

  <!-- Stars -->
  ${Array.from({length: 20}, () => {
    const sx = Math.random() * s;
    const sy = Math.random() * s;
    const sr = Math.random() * 1.5 + 0.5;
    return `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="white" opacity="${Math.random() * 0.5 + 0.2}"/>`;
  }).join('\n  ')}

  <!-- Ship glow halo -->
  <circle cx="${cx}" cy="${cy - shipSize * 0.1}" r="${glowRadius}" fill="none" stroke="#00FFFF" stroke-width="${s * 0.015}" opacity="0.15" filter="url(#bigglow)"/>

  <!-- Ship body -->
  <g filter="url(#glow)">
    <!-- Main fuselage -->
    <polygon points="${cx},${cy - shipSize} ${cx + shipSize * 0.4},${cy + shipSize * 0.6} ${cx},${cy + shipSize * 0.3} ${cx - shipSize * 0.4},${cy + shipSize * 0.6}" fill="#00FFFF"/>

    <!-- Wings -->
    <polygon points="${cx - shipSize * 0.15},${cy - shipSize * 0.1} ${cx - shipSize * 0.7},${cy + shipSize * 0.7} ${cx - shipSize * 0.2},${cy + shipSize * 0.4}" fill="#0088AA"/>
    <polygon points="${cx + shipSize * 0.15},${cy - shipSize * 0.1} ${cx + shipSize * 0.7},${cy + shipSize * 0.7} ${cx + shipSize * 0.2},${cy + shipSize * 0.4}" fill="#0088AA"/>

    <!-- Cockpit -->
    <circle cx="${cx}" cy="${cy - shipSize * 0.2}" r="${shipSize * 0.12}" fill="white"/>
  </g>

  <!-- Engine exhaust -->
  <polygon points="${cx - shipSize * 0.12},${cy + shipSize * 0.6} ${cx},${cy + shipSize * 1.0} ${cx + shipSize * 0.12},${cy + shipSize * 0.6}" fill="#00CCFF" opacity="0.8" filter="url(#glow)"/>

  <!-- Title text -->
  <text x="${cx}" y="${s * 0.88}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${s * 0.08}" fill="#00FFFF" filter="url(#glow)">SPACE SHOOTER</text>
</svg>`;
}

function createFaviconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#050A1A"/>
  <polygon points="16,4 22,22 16,18 10,22" fill="#00FFFF"/>
  <circle cx="16" cy="11" r="2" fill="white"/>
</svg>`;
}

async function generate() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');

  // Generate PWA icons
  for (const size of ICON_SIZES) {
    const svg = createIconSVG(size);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // Generate apple-touch-icon
  const appleSvg = createIconSVG(APPLE_TOUCH_SIZE);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate favicon
  const faviconSvg = createFaviconSVG();
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon.png'));
  console.log('Generated favicon.png');

  console.log('All icons generated!');
}

generate().catch(console.error);
