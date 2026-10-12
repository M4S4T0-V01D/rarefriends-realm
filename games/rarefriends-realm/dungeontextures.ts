/**
 * The dungeon families' stone and floors (dungeontheme.ts), painted as pixel art the way textures.ts paints the rest:
 * one call per face from wallTexture (a 16 × 24 wall face) and groundTexture (a 16 × 16 floor tile), four variants
 * each so nothing repeats. Each family's painter is its own: burial niches in dark masonry; volcanic rock shored with
 * timber and veined with ore; frost-crusted stone hung with icicles; dressed stone carved with sigil lines that glow;
 * black stone cracked with pale veins; rough natural rock.
 */
type Painter = {
  rect: (x: number, y: number, w: number, h: number, color: string) => void;
  set: (x: number, y: number, color: string) => void;
  line: (x0: number, y0: number, x1: number, y1: number, color: string) => void;
  polyline: (points: readonly (readonly [number, number])[], color: string) => void;
  disc: (cx: number, cy: number, rx: number, ry: number, fill: string, stroke: string | null) => void;
};
type Noise = (x: number, y: number, salt: number) => number;
type Shade = (hex: string, amount: number) => string;

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/** The dungeon wall faces: W × H (16 × 24). */
export function themedWall(p: Painter, style: string, color: string, variant: number, noise: Noise, shade: Shade, W: number, H: number): boolean {
  const mortar = shade(color, -0.2);
  const courses = (rowH: number, stoneW: number, jitter = 0.08) => {
    p.rect(0, 0, W, H, color);
    for (let row = 0; row < Math.ceil(H / rowH); row++) {
      const y = row * rowH, offset = row % 2 ? Math.floor(stoneW / 2) : 0;
      for (let bx = -offset; bx < W; bx += stoneW) {
        const stone = shade(color, (noise(bx + 40, row, variant) - 0.5) * jitter);
        p.rect(bx + 1, y + 1, stoneW - 1, rowH - 1, stone); p.rect(bx + 1, y + 1, stoneW - 1, 1, shade(stone, 0.06));
      }
      p.rect(0, y, W, 1, mortar); for (let bx = -offset; bx <= W; bx += stoneW) p.rect(bx, y, 1, rowH, mortar);
    }
  };
  switch (style) {
    case "ossuary": {
      // Heavy dark courses, and in every other face a burial niche: an arched hollow, blacker than the wall, with the
      // round of a skull or the ends of long bones laid in it; dust along the courses, a cobweb in a corner.
      courses(6, 8, 0.06);
      if (variant % 2 === 0) {
        const x0 = 4 + (variant === 2 ? 1 : 0), y0 = 5, w = 8, h = 12;
        p.rect(x0, y0 + 1, w, h - 1, "#15141a"); p.rect(x0 + 1, y0, w - 2, 1, "#15141a"); p.rect(x0, y0 + 1, 1, h - 1, "#0e0d12"); p.rect(x0 + w - 1, y0 + 1, 1, h - 1, "#0e0d12");
        if (variant === 0) { p.disc(x0 + 4, y0 + 7, 2.4, 2.1, "#d8d2c2", null); p.set(x0 + 3, y0 + 7, "#2a2730"); p.set(x0 + 5, y0 + 7, "#2a2730"); p.rect(x0 + 3, y0 + 9, 3, 1, "#b9b3a3"); }
        else { for (let i = 0; i < 3; i++) { p.rect(x0 + 1, y0 + 4 + i * 3, w - 2, 1, "#cfc9b8"); p.set(x0 + 1, y0 + 4 + i * 3, "#e6e0cf"); p.set(x0 + w - 2, y0 + 4 + i * 3, "#e6e0cf"); } }
        p.rect(x0 - 1, y0 + h, w + 2, 1, shade(color, 0.12));
      } else {
        for (let i = 0; i < 5; i++) p.set(Math.floor(noise(i, 7, variant) * W), Math.floor(noise(i, 9, variant) * H), shade(color, -0.2));
        if (variant === 3) p.polyline([[0, 2], [3, 5], [1, 9]], "#8a877f"), p.polyline([[0, 4], [2, 6]], "#8a877f");
      }
      return true;
    }
    case "scorched": {
      // Volcanic rock, no courses: lumps of dark stone with a red glow deep in the cracks; a timber prop up one side of
      // every other face, its cap beam across the top; a vein of ore (copper and a glint of moonsilver) in the rest.
      p.rect(0, 0, W, H, color);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = noise(x >> 1, y >> 1, variant + 3); if (n > 0.62) p.set(x, y, shade(color, 0.07)); else if (n < 0.3 && BAYER[y & 3][x & 3] < 3) p.set(x, y, shade(color, -0.1)); }
      for (let i = 0; i < 3; i++) { const x = Math.floor(noise(i, 1, variant) * (W - 4)), y = Math.floor(noise(i, 2, variant) * (H - 6)); p.polyline([[x, y], [x + 2, y + 3], [x + 1, y + 6]], "#1a1412"); p.set(x + 1, y + 2, "#c9502a"); p.set(x + 2, y + 4, "#ff8a3c"); }
      if (variant % 2 === 0) {
        const px = variant === 0 ? 1 : W - 3; p.rect(px, 0, 2, H, "#6f5440"); p.rect(px, 0, 1, H, "#8a6a50"); for (let y = 3; y < H; y += 5) p.set(px + 1, y, "#4a3628");
        p.rect(0, 0, W, 2, "#6f5440"); p.rect(0, 0, W, 1, "#8a6a50");
      } else {
        const y = 6 + variant * 3; p.polyline([[0, y], [5, y + 2], [9, y + 1], [W - 1, y + 4]], "#b87333"); p.set(6, y + 2, "#e3a05a"); p.set(12, y + 3, "#9fabc2"); p.set(3, y + 1, "#d9cf9a");
      }
      return true;
    }
    case "rime": {
      // Cold grey stone in big uneven blocks, a crust of frost along the top and down the joints, icicles from the top
      // edge of every other face, and a pale seam of mineral across the rest.
      courses(8, 8, 0.05);
      p.rect(0, 0, W, 2, "#eef2f6"); for (let x = 0; x < W; x++) if (noise(x, 1, variant) > 0.4) p.set(x, 2, "#dfe7ec");
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER[y & 3][x & 3] < 1 && noise(x, y, variant + 9) > 0.7) p.set(x, y, "#dfe7ec");
      if (variant % 2 === 0) for (let i = 0; i < 3; i++) { const x = 2 + i * 5 + (variant === 2 ? 1 : 0), len = 4 + Math.floor(noise(i, 5, variant) * 5); p.rect(x, 2, 1, len, "#dfe7ec"); p.set(x, 2 + len, "#ffffff"); p.rect(x + 1, 2, 1, Math.max(1, len - 3), "#b4c0cf"); }
      else { const y = 10 + variant * 2; p.polyline([[0, y], [4, y - 1], [8, y + 1], [W - 1, y]], "#c7d3dc"); p.set(5, y, "#ffffff"); p.set(11, y + 1, "#9fabc2"); }
      return true;
    }
    case "arcane": {
      // Dressed stone in long courses, and carved into every face a sigil line: a geometric figure (a ring, a lozenge, a
      // meander) that glows a soft violet from within the groove, and a pin of brighter light at a vertex.
      courses(6, 16, 0.04);
      const glow = "#9a82e0", bright = "#d7c9ff";
      if (variant === 0) { p.disc(8, 12, 4.5, 4.5, "transparent", glow); p.disc(8, 12, 2, 2, "transparent", glow); p.set(8, 7, bright); }
      else if (variant === 1) { p.polyline([[8, 4], [13, 12], [8, 20], [3, 12], [8, 4]], glow); p.set(8, 4, bright); p.set(8, 20, bright); }
      else if (variant === 2) { p.polyline([[1, 8], [5, 8], [5, 14], [10, 14], [10, 8], [15, 8]], glow); p.set(5, 14, bright); }
      else { p.polyline([[2, 18], [8, 6], [14, 18], [2, 18]], glow); p.set(8, 6, bright); p.polyline([[5, 12], [11, 12]], glow); }
      return true;
    }
    case "hollow": {
      // Black stone, nearly featureless, cracked with pale veins that fork as they fall; the mortar darker than the stone.
      p.rect(0, 0, W, H, color);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER[y & 3][x & 3] < 2 && noise(x, y, variant + 2) > 0.6) p.set(x, y, shade(color, -0.12));
      const x0 = 3 + Math.floor(noise(0, 1, variant) * 9), vein = "#9aa0b8", pale = "#d6cff0";
      p.polyline([[x0, 0], [x0 + 1, 5], [x0 - 1, 10], [x0, 16], [x0 + 2, 23]], vein); p.polyline([[x0 - 1, 10], [x0 - 4, 14], [x0 - 5, 19]], vein); p.set(x0 + 1, 5, pale); p.set(x0, 16, pale);
      if (variant === 3) p.polyline([[W - 2, 0], [W - 3, 6], [W - 1, 11]], vein);
      return true;
    }
    case "cave": {
      // Rough rock: lumps and hollows with no courses, lit from above, a seep of damp down one side, pebbles at the foot.
      p.rect(0, 0, W, H, color);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = noise(x >> 1, (y >> 1) + variant * 7, 4); if (n > 0.6) p.set(x, y, shade(color, 0.08)); else if (n < 0.32) p.set(x, y, shade(color, -0.11)); }
      for (let i = 0; i < 4; i++) { const x = Math.floor(noise(i, 3, variant) * (W - 3)), y = Math.floor(noise(i, 4, variant) * (H - 3)); p.rect(x, y, 3, 1, shade(color, 0.12)); p.rect(x, y + 1, 3, 1, shade(color, -0.16)); }
      if (variant % 2) { const x = variant === 1 ? 2 : W - 3; for (let y = 0; y < H; y++) if (noise(x, y, variant) > 0.35) p.set(x, y, shade(color, -0.22)); }
      for (let x = 0; x < W; x += 3) p.set(x + (variant % 3), H - 1, shade(color, -0.18));
      return true;
    }
  }
  return false;
}

/** The dungeon floors: S × S (16 × 16). */
export function themedGround(p: Painter, style: string, color: string, variant: number, noise: Noise, shade: Shade, S: number): boolean {
  const r = (i: number, salt: number) => noise(i, salt, variant + 11), tone = (amount: number) => shade(color, amount * 1.4);
  const speckle = (n: number, amount: number, salt = 0, color?: string) => { for (let i = 0; i < n; i++) p.set(Math.floor(r(i, 1 + salt) * S), Math.floor(r(i, 2 + salt) * S), color ?? tone(amount)); };
  const flags = (joint: string, moss?: string) => {
    const off = variant % 2 ? 4 : 0;
    for (const [x, y, w, h] of [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]]) { const t = tone((noise(x, y, variant) - 0.5) * 0.06); p.rect(x + (y ? off : 0), y + 1, w - 1, h - 1, t); p.rect(x + (y ? off : 0), y + 1, w - 1, 1, shade(t, 0.05)); }
    p.rect(0, 0, S, 1, joint); p.rect(0, 8, S, 1, joint); p.rect(7, 0, 1, 8, joint); p.rect(15, 0, 1, 8, joint); p.rect((7 + off) % S, 8, 1, 8, joint); p.rect((15 + off) % S, 8, 1, 8, joint);
    if (moss) [0, 1, 2].forEach(i => p.set(Math.floor(r(i, 13) * S), Math.floor(r(i, 14) * S), moss));
  };
  switch (style) {
    case "ossuary":
      // Worn flagstones under a film of dust; a bone or two where the floor meets the wall, a candle's drip.
      flags(tone(-0.12)); speckle(6, -0.06, 3);
      if (variant === 1) { p.rect(3, 11, 5, 1, "#cfc9b8"); p.set(3, 11, "#e6e0cf"); p.set(7, 11, "#e6e0cf"); } if (variant === 3) { p.disc(11, 5, 1.6, 1.4, "#d8d2c2", null); p.set(11, 5, "#2a2730"); }
      if (variant === 2) p.set(12, 12, "#e9c87a"), p.set(12, 13, "#c9a860");
      return true;
    case "mine":
      // Grit and spoil: dark gravel trodden flat, the odd knob of ore, and (one tile in four) the two rails of a cart track.
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (BAYER[y & 3][x & 3] < 2 && noise(x >> 1, y >> 1, variant + 3) > 0.55) p.set(x, y, tone(-0.08));
      for (let i = 0; i < 7; i++) { const x = Math.floor(r(i, 3) * (S - 2)), y = Math.floor(r(i, 4) * (S - 2)); p.rect(x, y, 2, 1, tone(0.07)); p.rect(x, y + 1, 2, 1, tone(-0.14)); }
      if (variant === 2) { p.set(4, 9, "#b87333"); p.set(11, 4, "#9fabc2"); }
      if (variant === 0) { p.rect(0, 5, S, 1, "#6f6a62"); p.rect(0, 10, S, 1, "#6f6a62"); for (let x = 1; x < S; x += 4) p.rect(x, 4, 2, 8, "#5a4636"); p.rect(0, 5, S, 1, "#8a857d"); p.rect(0, 10, S, 1, "#8a857d"); }
      return true;
    case "rime":
      // Ice over stone: a pale glaze with the stone showing through in patches, frost crystals, cracks that catch the light.
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const n = noise(x >> 1, y >> 1, variant + 21); if (n > 0.6 && BAYER[y & 3][x & 3] < 3) p.set(x, y, "#b4c0cf"); else if (n < 0.3) p.set(x, y, "#dfe7ec"); }
      for (let i = 0; i < 2; i++) { const x = Math.floor(r(i, 3) * 10) + 2, y = Math.floor(r(i, 4) * 10) + 2; p.polyline([[x, y], [x + 3, y + 1], [x + 4, y + 4]], "#ffffff"); }
      if (variant === 1) { p.set(5, 5, "#ffffff"); p.set(4, 6, "#eef2f6"); p.set(6, 6, "#eef2f6"); p.set(5, 7, "#eef2f6"); p.set(5, 6, "#ffffff"); }
      speckle(3, -0.1, 2);
      return true;
    case "sigil":
      // Flagstones laid in a pattern: dark joints, and in the middle of one tile in four a carved sigil, its groove alight.
      flags(tone(-0.16));
      if (variant === 0) { p.disc(8, 8, 3.5, 3.5, "transparent", "#9a82e0"); p.set(8, 8, "#d7c9ff"); }
      else if (variant === 2) { p.polyline([[8, 3], [12, 8], [8, 13], [4, 8], [8, 3]], "#9a82e0"); p.set(8, 8, "#d7c9ff"); }
      else speckle(2, -0.08, 5), (variant === 3 && p.set(13, 2, "#b4a0ff"));
      return true;
    case "cave":
      // Bare rock floor: uneven, dark in the hollows, a few loose stones, damp in one corner.
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const n = noise(x >> 1, y >> 1, variant + 5); if (n > 0.64) p.set(x, y, tone(0.06)); else if (n < 0.3 && BAYER[y & 3][x & 3] < 2) p.set(x, y, tone(-0.1)); }
      for (let i = 0; i < 4; i++) { const x = Math.floor(r(i, 3) * (S - 2)), y = Math.floor(r(i, 4) * (S - 2)); p.rect(x, y, 2, 1, tone(0.08)); p.rect(x, y + 1, 2, 1, tone(-0.15)); }
      if (variant === 3) p.disc(11, 11, 2.5, 1.5, tone(-0.18), null);
      return true;
    case "mossy":
      // Old flagstones with moss in every joint and a root across one tile in four.
      flags(tone(-0.14), "#6f7a62");
      for (let i = 0; i < 5; i++) p.set(Math.floor(r(i, 23) * S), Math.floor(r(i, 24) * S), "#7f9a62");
      if (variant === 1) p.polyline([[0, 10], [5, 9], [9, 11], [S - 1, 10]], "#6f5440"), p.polyline([[9, 11], [11, 14]], "#6f5440");
      return true;
  }
  return false;
}
