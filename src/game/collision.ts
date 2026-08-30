export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function checkCollision(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function getPlayerHitbox(x: number, y: number, width: number, height: number): Rectangle {
  const inset = 0.3;
  const hw = (width * (1 - inset)) / 2;
  const hh = (height * (1 - inset)) / 2;
  return {
    x: x + width / 2 - hw,
    y: y + height / 2 - hh,
    width: hw * 2,
    height: hh * 2,
  };
}

export function checkCircleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}
