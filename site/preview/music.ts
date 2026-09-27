// Preview page soundtrack: the game's own procedural music. A jukebox of every track, the hero's "Hear the main theme"
// button and a floating play button. Browsers only allow audio after a click, so nothing autoplays.
import { RealmAudio, TRACKS, type TrackId } from "../../games/rarefriends-realm/audio.ts";

const WHERE: Partial<Record<TrackId, string>> = {
  theme: "Title screen", friendhollow: "Friendhollow", farmland: "Hollow Farms", whisperwood: "Whisperwood", ashen_hills: "Ashen Hills",
  emberforge: "Emberforge", frostpeak: "Frostpeak", glass_lake: "Glass Lake", pale_dunes: "Pale Dunes", oasis: "The Oasis", murkmire: "Murkmire",
  mossy_ruins: "Mossy Ruins", coast: "The Pale Coast", crypt: "Murkmire Crypt", hollow_depths: "Hollow Depths", boss: "The throne room",
};
const player = new RealmAudio();
player.setSfx(false); player.setVolumes(0.75, 0);
let playing: TrackId | null = null;
const list = document.getElementById("jukebox"), now = document.getElementById("now"), floating = document.getElementById("music") as HTMLButtonElement | null;
const label = floating?.querySelector<HTMLElement>(".music-label");
const buttons = new Map<TrackId, HTMLButtonElement>();
for (const track of TRACKS) {
  const item = document.createElement("li"), button = document.createElement("button");
  button.type = "button"; button.setAttribute("aria-pressed", "false"); button.dataset.track = track.id;
  button.innerHTML = `<small>${WHERE[track.id] ?? ""}</small><b>♪ ${track.name}</b><small>${track.bpm} bpm</small>`;
  item.append(button); list?.append(item); buttons.set(track.id, button);
}
function show() {
  for (const [id, button] of buttons) button.setAttribute("aria-pressed", String(id === playing));
  const name = playing ? TRACKS.find(track => track.id === playing)?.name : null;
  if (now) now.textContent = name ? `Now playing: ${name} (${WHERE[playing!] ?? ""}). Click it again to stop.` : "Nothing playing. Browsers only start sound after a click.";
  floating?.setAttribute("aria-pressed", String(!!playing)); floating?.classList.toggle("on", !!playing);
  if (label) label.textContent = name ? `♪ ${name}` : "Play the main theme";
}
function toggle(id: TrackId) {
  if (playing === id) { playing = null; player.setMuted(true); show(); return; }
  playing = id; player.play(id); player.setMuted(false); player.unlock(); show();
}
document.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-track]");
  if (target) toggle(target.dataset.track as TrackId);
});
floating?.addEventListener("click", () => toggle(playing ?? "theme"));
// Rest while the tab is hidden, pick the tune back up on return.
document.addEventListener("visibilitychange", () => {
  if (!playing) return;
  player.setMuted(document.hidden);
  if (!document.hidden) player.unlock();
});
show();
