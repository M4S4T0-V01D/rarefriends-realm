/**
 * The faces of the world's furniture and stonework (textures.ts wallTexture asks here first), painted like the walls:
 * boards with their grain and nail heads; a patchwork quilt and plain linen for a bed; a column's fluting; dressed stone
 * with a carved band; a coffin lid's carving. 16 × 24, four variants each, the face's shade baked into the colour.
 */
type Painter = {
  rect: (x: number, y: number, w: number, h: number, color: string) => void;
  set: (x: number, y: number, color: string) => void;
  line: (x0: number, y0: number, x1: number, y1: number, color: string) => void;
};
type Noise = (x: number, y: number, salt: number) => number;
type Shade = (hex: string, amount: number) => string;
export const PROP_STYLES = ["planks", "quilt", "linen", "fluted", "carved", "lid"] as const;
export type PropStyle = (typeof PROP_STYLES)[number];

export function propWall(p: Painter, style: string, color: string, variant: number, noise: Noise, shade: Shade, W: number, H: number): boolean {
  switch (style) {
    case "planks": {
      // Boards running along, 4 pixels wide, each its own tone, the grain in dashes, a nail at each end.
      for (let row = 0; row < H / 4; row++) {
        const y = row * 4, board = shade(color, (noise(row, 3, variant) - 0.5) * 0.12);
        p.rect(0, y, W, 4, board); p.rect(0, y, W, 1, shade(board, 0.08)); p.rect(0, y + 3, W, 1, shade(color, -0.24));
        for (let k = 0; k < 3; k++) { const x = Math.floor(noise(row, k + 9, variant) * (W - 4)); p.line(x, y + 1 + (k % 2), x + 3, y + 1 + (k % 2), shade(board, -0.1)); }
        p.set(1, y + 1, shade(color, -0.35)); p.set(W - 2, y + 2, shade(color, -0.35));
      }
      return true;
    }
    case "quilt": {
      // A patchwork quilt: squares of four colours round the base colour, stitched, a lighter fold every so often.
      const patches = [color, shade(color, 0.14), shade(color, -0.12), "#efe4cc"];
      for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
        const c = patches[Math.floor(noise(x, y, variant) * 4) % 4];
        p.rect(x, y, 4, 4, c); p.set(x + 1, y + 1, shade(c, 0.1));
        if (noise(x + 7, y, variant) < 0.4) { p.set(x + 2, y + 2, shade(c, -0.18)); }
      }
      for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 2) p.set(x, y, shade(color, -0.3));
      return true;
    }
    case "linen": {
      // Plain linen: a fine weave, a crease or two.
      p.rect(0, 0, W, H, color);
      for (let y = 0; y < H; y++) for (let x = (y % 2); x < W; x += 2) if (noise(x, y, variant) < 0.3) p.set(x, y, shade(color, -0.05));
      p.line(2, 5 + variant, W - 3, 7 + variant, shade(color, -0.1));
      return true;
    }
    case "fluted": {
      // A column's shaft: flutes running up it, each a dark groove with a lit edge, a little weathering.
      p.rect(0, 0, W, H, color);
      for (let x = 1; x < W; x += 4) { p.line(x, 0, x, H - 1, shade(color, -0.2)); p.line(x + 1, 0, x + 1, H - 1, shade(color, 0.1)); }
      for (let k = 0; k < 6; k++) p.set(Math.floor(noise(k, 2, variant) * W), Math.floor(noise(k, 5, variant) * H), shade(color, -0.28));
      return true;
    }
    case "carved": {
      // Dressed stone in two big courses with a carved band between: a running pattern of lozenges.
      p.rect(0, 0, W, H, color);
      for (const y of [0, 15]) { p.rect(0, y, W, 1, shade(color, 0.1)); }
      p.rect(0, 8, W, 6, shade(color, -0.08)); p.rect(0, 8, W, 1, shade(color, -0.25)); p.rect(0, 13, W, 1, shade(color, -0.25));
      for (let x = 0; x < W; x += 4) { p.set(x + 2, 9, shade(color, -0.3)); p.set(x + 1, 10, shade(color, -0.3)); p.set(x + 3, 10, shade(color, -0.3)); p.set(x + 2, 11, shade(color, -0.3)); p.set(x + 2, 10, shade(color, 0.15)); }
      for (let k = 0; k < 8; k++) p.set(Math.floor(noise(k, 11, variant) * W), Math.floor(noise(k, 13, variant) * H), shade(color, noise(k, 17, variant) < 0.5 ? -0.2 : 0.12));
      return true;
    }
    case "lid": {
      // A coffin's lid: a raised border, a long cross carved down it, worn at the corners.
      p.rect(0, 0, W, H, color);
      p.rect(0, 0, W, 2, shade(color, 0.12)); p.rect(0, H - 2, W, 2, shade(color, -0.2)); p.rect(0, 0, 2, H, shade(color, 0.06)); p.rect(W - 2, 0, 2, H, shade(color, -0.16));
      p.rect(7, 4, 2, H - 8, shade(color, -0.24)); p.rect(4, 8, 8, 2, shade(color, -0.24)); p.line(8, 4, 8, H - 5, shade(color, 0.14));
      for (let k = 0; k < 5; k++) p.set(2 + Math.floor(noise(k, 19, variant) * (W - 4)), 2 + Math.floor(noise(k, 23, variant) * (H - 4)), shade(color, -0.3));
      return true;
    }
  }
  return false;
}
