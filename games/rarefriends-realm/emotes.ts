/**
 * How emotes move: a sprite can't bend its arms, so each emote is a little choreography of hops, bows (squash), leans,
 * turns and spins, with a word over the head and some particles. Used for your Friend and for other players'.
 */
import type { Facing } from "./state.ts";
import { burst } from "./effects.ts";

export type Motion = { hop: number; lean: number; squash: number; facing: Facing | null; text: string | null };
const TURN: Facing[] = ["down", "right", "up", "left"];

/** Where an emote is `t` seconds in. */
export function emoteMotion(id: string, t: number, base: Facing, reduced: boolean): Motion {
  const still: Motion = { hop: 0, lean: 0, squash: 1, facing: null, text: null };
  if (reduced) return { ...still, text: TEXT[id] ?? null };
  const beat = (hz: number) => Math.abs(Math.sin(t * Math.PI * hz));
  switch (id) {
    case "wave": return { ...still, lean: Math.sin(t * 9) * 0.12, text: "o/" };
    case "bow": return { ...still, squash: 1 - Math.sin(Math.min(1, t / 1.2) * Math.PI) * 0.22, lean: Math.sin(Math.min(1, t / 1.2) * Math.PI) * 0.18 * (base === "left" ? -1 : 1) };
    case "dance": return { ...still, hop: beat(2.2) * 7, lean: Math.sin(t * 7) * 0.1, facing: Math.floor(t * 3.3) % 2 ? "left" : "right", text: Math.floor(t * 2) % 2 ? "♪" : "♫" };
    case "cheer": return { ...still, hop: beat(1.6) * 14, squash: 1 + beat(1.6) * 0.06, text: "Hooray!" };
    case "clap": return { ...still, hop: beat(4) * 2, squash: 1 - beat(4) * 0.05, text: "*clap clap*" };
    case "laugh": return { ...still, hop: beat(5) * 3, lean: Math.sin(t * 16) * 0.05, text: "Ha ha ha!" };
    case "cry": return { ...still, squash: 0.94 + Math.sin(t * 6) * 0.02, lean: Math.sin(t * 3) * 0.05, text: "*sob*" };
    case "think": return { ...still, lean: Math.sin(t * 1.5) * 0.06, text: t % 2 < 1 ? "Hmm…" : "Hmm…?" };
    case "jump": return { ...still, hop: Math.max(0, Math.sin(t * Math.PI * 1.4)) * 22, squash: t % (1 / 0.7) < 0.12 ? 0.85 : 1, text: "Woo!" };
    case "yes": return { ...still, squash: 1 - beat(3) * 0.08, text: "Yes!" };
    case "no": return { ...still, facing: Math.floor(t * 6) % 2 ? "left" : "right", text: "No!" };
    case "spin": return { ...still, facing: TURN[Math.floor(t * 6) % 4], hop: beat(1) * 3 };
    case "flex": return { ...still, squash: 1 + beat(1.5) * 0.1, text: "Hmph!" };
    case "skillcape": return { ...still, facing: t < 2.4 ? TURN[Math.floor(t * 5) % 4] : "down", hop: t > 2.6 && t < 3.4 ? Math.sin((t - 2.6) / 0.8 * Math.PI) * 26 : 0, text: t > 3 ? "Mastered!" : null };
    default: return still;
  }
}
const TEXT: Record<string, string> = { wave: "o/", cheer: "Hooray!", clap: "*clap clap*", laugh: "Ha ha ha!", cry: "*sob*", think: "Hmm…", jump: "Woo!", yes: "Yes!", no: "No!", flex: "Hmph!" };
/** Particles for an emote this frame (confetti, tears, a skillcape's sparks). `x`, `y` are world tiles. */
export function emoteParticles(id: string, t: number, x: number, y: number, reduced: boolean, color = "#e2d49e") {
  if (reduced) return;
  if (id === "cheer" && Math.random() < 0.25) burst("chip", x, y, 50, 2, ["#d8b6b4", "#e2d7ad", "#afbccb", "#b4c3ab", "#c6bed4"][Math.floor(Math.random() * 5)], { speed: 1, up: 60, life: 1, size: 2.5 });
  if (id === "cry" && Math.random() < 0.18) burst("drop", x + (Math.random() - 0.5) * 0.2, y, 44, 1, "#9fc6f0", { speed: 0.2, up: 10, life: 0.7, size: 2 });
  if (id === "skillcape" && Math.random() < 0.5) burst("spark", x, y, 20 + Math.random() * 40, 2, Math.random() < 0.5 ? color : "#ffffff", { speed: 1.1, up: 60, life: 0.9, size: 2.5 });
  if (id === "jump" && t < 0.1 && Math.random() < 0.5) burst("dust", x, y, 2, 6, "#c8c5be", { speed: 0.6, up: 6, life: 0.5, size: 2 });
}
