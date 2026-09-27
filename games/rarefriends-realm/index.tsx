"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { formatGameAmount } from "@rarefriends/friendsdk/ui";
import { expectedReward, maximumPrize, type GamePlay, type GameSnapshot } from "@rarefriends/friendsdk/game";
import { createFriendReader, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { FAMILY_NAMES, FAMILY_PERKS, RELICS, RF_BUNDLES, SKILL_ICONS, SPELLS, WARDROBE, item, type Skill } from "./data.ts";
import { QUESTS, questPoints, MAX_QUEST_POINTS } from "./content.ts";
import { TICK_MS, combatLevel, createGame, message, totalLevel, type Game, type Projectile } from "./state.ts";
import {
  chooseOption, closeInterfaces, collectFromCasket, continueDialogue, grantBundle, menuFor, tailorChoices, unlockMusic, restore, serialize, setFollower, setHeld, setRelics, tick, toggleRun, walkTo, type OwnedFriend, type Selection,
} from "./engine.ts";
import { PITCH, VIEW, ZOOM, daylight, minimapTile, northAngle, pickAt, renderMinimap, renderScene, toScreen, toTile, type Camera, type ClickMarker, type Firework, type HitSplat } from "./render.ts";
import {
  BankModal, ChatBox, ContextMenu, DialogueBox, FriendPortrait, HelpModal, LampModal, LevelUpBox, Modal, Orbs, PixelIcon, ProductionBox, ShopModal, SidePanel, TABS, WorldMapModal,
  cancelLongPress, longPress, type MenuEntry, type Settings, type Tab,
} from "./panels.tsx";
import { REGULAR_SPRITES } from "./regulars.ts";
import { HOST_HELLO, HOST_STATE, SAVE_WRITE, SHARE_REQUEST, SHARE_RESULT, parseRoster, type ShareAction, type ShareOutcome } from "./roster.ts";
import { RealmAudio, trackFor, trackById, type SfxName, type TrackId } from "./audio.ts";
import { renderCard, shareText } from "./card.ts";
import { skillArt } from "./icons.ts";
import { T, isUnderground, isWater, realPoint, regionAt, terrainAt } from "./world.ts";
import "@rarefriends/friendsdk/frame.css";
import "./style.css";

const rf = (value: bigint) => `${formatGameAmount(value, 18)} RF`;
type Phase = "loading" | "title" | "playing" | "failed";
type Modal = "caskets" | "map" | "card" | "help" | null;
type XpDrop = { id: number; skill: Skill; amount: number; at: number };
type CasketResult = { play: bigint; outcomeId: number; wardrobe: string | null; coins: number; redeemed: boolean };
const CANONICAL = new Map<number, GenerationSprites>(REGULAR_SPRITES.map(sprites => [Number(sprites.tokenId), sprites]));
/** WASD walks in screen directions; the arrow keys turn and tilt the camera. */
const KEY_DIRECTIONS: Record<string, [number, number]> = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
const CAMERA_KEYS = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown"]);
const TURN_SPEED = 1.9, TILT_SPEED = 0.45;
/** The camera angle that puts world north at the top of the screen (the compass). */
const NORTH = -Math.PI / 4;
/** A Realm day lasts 24 minutes. Automated test runs stay at noon unless they set the time. */
const DAY_MS = 24 * 60_000;
let fixedTime: number | null = typeof navigator !== "undefined" && navigator.webdriver ? 0.5 : null;
const timeOfDay = () => fixedTime ?? ((Date.now() / DAY_MS + 0.3) % 1);
const DEFAULT_SETTINGS: Settings = { music: true, sfx: true, musicVolume: 0.7, sfxVolume: 0.8, zoom: 0.8, shiftDrop: false, autoMusic: true, dayNight: true };

/** RareFriends Realm. The SDK runtime supplies wallet connection, the verified owned Friend and the fixed (simulated) RF client. */
export default function RareFriendsRealm({ friendId, client, paused }: GameComponentProps) {
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), minimap = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null), friend = useRef<GenerationSprites | null>(null), audio = useRef<RealmAudio | null>(null);
  const followerSprites = useRef(new Map<number, GenerationSprites>()), loadingSprites = useRef(new Set<number>());
  const camera = useRef<Camera>({ x: 121, y: 121, zoom: DEFAULT_SETTINGS.zoom, angle: 0, pitch: PITCH.classic }), cameraGoal = useRef<{ angle: number; pitch: number } | null>(null),
    compass = useRef<HTMLButtonElement>(null), orbit = useRef<{ x: number; y: number; angle: number; pitch: number } | null>(null), miniZoom = useRef(3.2), tickAt = useRef(0), hits = useRef<HitSplat[]>([]), fireworks = useRef<Firework[]>([]);
  const projectiles = useRef<Projectile[]>([]), marker = useRef<ClickMarker | null>(null), hoverTile = useRef<{ x: number; y: number } | null>(null), chat = useRef<{ text: string; until: number } | null>(null);
  const held = useRef(new Set<string>()), linked = useRef(false), lastSave = useRef(""), region = useRef(""), epoch = useRef(0), pointer = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("loading"), [status, setStatus] = useState("Waking your Friend and unfolding the Realm…");
  const [, setVersion] = useState(0), [tab, setTab] = useState<Tab>("inventory"), [selection, setSelection] = useState<Selection>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; entries: MenuEntry[] } | null>(null), [modal, setModal] = useState<Modal>(null);
  const [hover, setHover] = useState(""), [toast, setToast] = useState<{ title: string; sub?: string } | null>(null), [drops, setDrops] = useState<XpDrop[]>([]);
  const [levelUps, setLevelUps] = useState<{ skill: Skill; level: number }[]>([]), [quest, setQuest] = useState<string | null>(null), [dead, setDead] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS), [roster, setRoster] = useState<OwnedFriend[]>([]), [rosterState, setRosterState] = useState<"waiting" | "ready" | "none">("waiting");
  const [hosted, setHosted] = useState<"waiting" | "linked" | "none">("waiting"), [hasSave, setHasSave] = useState<{ total: number; combat: number; qp: number; where: string } | null>(null);
  const [tailorPick, setTailorPick] = useState("");
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null), [busy, setBusy] = useState(false), [casketError, setCasketError] = useState(""), [reveal, setReveal] = useState<CasketResult[] | null>(null);
  const [size, setSize] = useState({ width: 960, height: 640, scale: 1 }), [sideOpen, setSideOpen] = useState(true), [shareStatus, setShareStatus] = useState(""), [cardUrl, setCardUrl] = useState<string | null>(null);
  const pendingSave = useRef<unknown>(null), cardBlob = useRef<Blob | null>(null);
  const live = useRef({ paused, phase, modal, menu, selection, settings }); live.current = { paused, phase, modal, menu, selection, settings };
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ---------- Layout: a logical stage scaled to fit the frame ----------
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth || 960, height = node.clientHeight || 640;
      const scale = Math.max(0.7, Math.min(1.35, Math.min(width / 960, height / 640)));
      const logical = { width: Math.round(width / scale), height: Math.round(height / scale), scale };
      VIEW.width = logical.width; VIEW.height = logical.height; setSize(logical); setSideOpen(logical.width >= 900 || logical.height >= 560);
      const view = canvas.current;
      if (view) { const ratio = Math.min(window.devicePixelRatio || 1, 2); view.width = Math.round(logical.width * scale * ratio); view.height = Math.round(logical.height * scale * ratio); }
    };
    const observer = new ResizeObserver(measure); observer.observe(node); measure();
    return () => observer.disconnect();
  }, [phase]);

  // ---------- Audio ----------
  const setSettings = useCallback((next: Settings) => {
    if (next.autoMusic && !live.current.settings.autoMusic) region.current = ""; // back to the area's own track on the next tick
    setSettingsState(next); camera.current.zoom = next.zoom;
    const player = audio.current;
    if (player) { player.setMusic(next.music); player.setSfx(next.sfx); player.setVolumes(next.musicVolume, next.sfxVolume); player.unlock(); }
  }, []);
  useEffect(() => {
    const wake = () => {
      const player = audio.current, s = live.current.settings;
      if (!player) return;
      const was = player.ready; player.setMusic(s.music); player.setSfx(s.sfx); player.setVolumes(s.musicVolume, s.sfxVolume); player.unlock();
      if (!was) setTimeout(() => setVersion(value => value + 1), 150);
    };
    const events = ["pointerup", "click", "keydown", "touchend"] as const;
    for (const name of events) window.addEventListener(name, wake, { capture: true, passive: true });
    return () => { for (const name of events) window.removeEventListener(name, wake, { capture: true }); };
  }, []);

  // ---------- Load: canonical artwork, the world, the host link ----------
  useEffect(() => {
    const version = ++epoch.current;
    audio.current?.dispose(); audio.current = new RealmAudio(); audio.current.play("theme");
    setPhase("loading"); setStatus("Waking your Friend and unfolding the Realm…"); setHosted("waiting"); setHasSave(null); setRoster([]); setRosterState("waiting");
    linked.current = false; lastSave.current = ""; pendingSave.current = null; followerSprites.current = new Map(); game.current = null; friend.current = null;
    const applyHost = (data: { ids?: unknown; save?: unknown }) => {
      const state = game.current, parsed = parseRoster(data.ids, friendId);
      if (!state || parsed === null) return;
      setRoster(parsed.others); setRosterState(parsed.others.length ? "ready" : "none");
      if (state.player.follower !== null) { const follower = parsed.others.find(entry => entry.id === state.player.follower); setFollower(state, follower ?? null); if (follower) loadFriendSprite(follower.id); }
      if (!linked.current) {
        linked.current = true; setHosted("linked");
        if (data.save && (live.current.phase !== "playing" || state.playTicks < 100)) {
          const probe = createGame({ familyId: state.player.familyId, friendId: Number(friendId) });
          if (restore(probe, data.save)) {
            restore(state, data.save);
            setHasSave({ total: totalLevel(state.player), combat: combatLevel(state.player), qp: questPoints(state), where: regionAt(state.world, state.player.x, state.player.y).name });
            if (live.current.phase === "playing") { message(state, "Welcome back! This wallet's adventure has been restored.", "info"); const at = realPoint(state.world, state.player.x, state.player.y); camera.current.x = at.x; camera.current.y = at.y; }
          }
        }
      }
      refresh();
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (event.data?.type === SHARE_RESULT) {
        const messages: Record<ShareOutcome, string> = {
          shared: "Shared! Pick X in your share sheet to post it.", cancelled: "Share cancelled.", failed: "Couldn't share from this browser. Try Save picture.",
          "copied-and-opened": "Picture copied and X opened: paste it into your post (Ctrl/Cmd+V), then press Post.",
          "saved-and-opened": "Picture saved and X opened: attach it to your post, then press Post.", copied: "Adventurer card copied as a picture.", saved: "Adventurer card saved as a picture.",
        };
        setShareStatus(messages[event.data.result as ShareOutcome] ?? messages.failed); return;
      }
      if (event.data?.type !== HOST_STATE) return;
      if (game.current) applyHost(event.data); else pendingSave.current = event.data;
    };
    window.addEventListener("message", receive);
    const hostTimer = setTimeout(() => { if (!linked.current && version === epoch.current) { setHosted("none"); setRosterState("none"); } }, 3500);
    void Promise.all([createFriendReader().read(friendId), client.read()]).then(([sprites, value]) => {
      if (version !== epoch.current) return;
      friend.current = sprites;
      const state = createGame({ familyId: sprites.familyId, friendId: Number(friendId) });
      game.current = state; camera.current = { x: state.world.places.spawn.x, y: state.world.places.spawn.y, zoom: live.current.settings.zoom, angle: 0, pitch: PITCH.classic };
      setRelics(state, value.inventory.map(amount => Number(amount > 99n ? 99n : amount))); setSnapshot(value);
      setPhase("title");
      // Automated browser tests only (navigator.webdriver): a handle for driving the camera and state.
      if (navigator.webdriver) (window as unknown as { __realm?: unknown }).__realm = {
        game: () => game.current, camera: () => ({ ...camera.current }), refresh: () => refresh(),
        /** Fix the time of day (0 midnight … 0.5 noon), or null to follow the clock. */
        time: (value: number | null) => { fixedTime = value; },
        view: (zoom: number, pitch: number, angle = 0) => { setSettings({ ...live.current.settings, zoom }); camera.current.pitch = pitch; camera.current.angle = angle; cameraGoal.current = null; },
        screenOf: (x: number, y: number) => {
          const view = canvas.current!.getBoundingClientRect(), point = toScreen(camera.current, x, y);
          return { x: view.left + point.x * view.width / VIEW.width, y: view.top + point.y * view.height / VIEW.height };
        },
      };
      if (pendingSave.current) { applyHost(pendingSave.current as { ids?: unknown; save?: unknown }); pendingSave.current = null; }
      window.parent.postMessage({ type: HOST_HELLO, friend: friendId.toString() }, "*");
    }).catch(() => { if (version === epoch.current) { setPhase("failed"); setStatus("Your Friend's artwork couldn't be loaded. Check your connection and try again."); } });
    return () => { clearTimeout(hostTimer); window.removeEventListener("message", receive); audio.current?.dispose(); audio.current = null; };
  }, [friendId, client]);

  const loadFriendSprite = useCallback((id: number) => {
    if (followerSprites.current.has(id) || loadingSprites.current.has(id)) return;
    loadingSprites.current.add(id);
    const version = epoch.current;
    void createFriendReader().read(BigInt(id)).then(sprites => { if (version === epoch.current) { followerSprites.current.set(id, sprites); refresh(); } })
      .catch(() => { /* Keep the stand-in art. */ }).finally(() => loadingSprites.current.delete(id));
  }, [refresh]);

  // ---------- Saving (through the trusted host, per wallet) ----------
  useEffect(() => {
    const save = () => {
      const state = game.current;
      if (!state || !linked.current || live.current.phase !== "playing") return;
      const data = serialize(state), raw = JSON.stringify(data);
      if (raw === lastSave.current) return;
      lastSave.current = raw; window.parent.postMessage({ type: SAVE_WRITE, friend: friendId.toString(), save: data }, "*");
    };
    const timer = setInterval(save, 5000);
    window.addEventListener("pagehide", save);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", save); save(); };
  }, [friendId]);

  // ---------- The loop: game ticks, events, camera, drawing ----------
  useEffect(() => {
    if (phase !== "title" && phase !== "playing") return;
    const node = canvas.current, ctx = node?.getContext("2d"), mini = minimap.current?.getContext("2d");
    if (!node || !ctx) return;
    let frame = 0, lastHud = 0, dropId = 0, lastFrame = 0;
    tickAt.current = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const state = game.current;
      if (!state) return;
      const { paused: isPaused, phase: current } = live.current;
      if (current === "playing" && !isPaused) {
        if (now - tickAt.current > TICK_MS * 6) tickAt.current = now - TICK_MS;
        while (now - tickAt.current >= TICK_MS) {
          tick(state); tickAt.current += TICK_MS;
          const fresh = state.events.splice(0);
          const xp = new Map<Skill, number>();
          for (const event of fresh) {
            if (event.type === "hit") hits.current.push({ on: event.on, uid: event.uid, damage: event.damage, at: now });
            else if (event.type === "xp") xp.set(event.skill, (xp.get(event.skill) ?? 0) + event.amount);
            else if (event.type === "level") { setLevelUps(list => [...list, { skill: event.skill, level: event.level }]); fireworks.current.push({ at: now, color: "#e2d7ad" }); }
            else if (event.type === "sound") audio.current?.sfx(event.name);
            else if (event.type === "swing") audio.current?.sfx(event.weapon);
            else if (event.type === "creature") audio.current?.creature(event.id, event.action, nearness(state, event.x, event.y));
            else if (event.type === "projectile") projectiles.current.push(event.projectile);
            else if (event.type === "death") { setDead(true); setTimeout(() => setDead(false), 2600); }
            else if (event.type === "quest") setQuest(event.quest);
          }
          if (xp.size) setDrops(list => [...list.filter(drop => now - drop.at < 1800), ...[...xp].map(([skill, amount]) => ({ id: ++dropId, skill, amount, at: now }))]);
          hits.current = hits.current.filter(hit => now - hit.at < 1300); projectiles.current = projectiles.current.filter(p => p.end >= state.tick - 1);
          fireworks.current = fireworks.current.filter(entry => now - entry.at < 2400);
          // Area music and the region banner.
          const here = regionAt(state.world, state.player.x, state.player.y), throne = state.player.x >= 177 && state.player.y >= 212 && state.player.y <= 236;
          const key = `${here.id}:${throne}`;
          if (key !== region.current) {
            region.current = key;
            const track = trackById(trackFor(here.id, throne));
            unlockMusic(state, track.id, track.name);
            if (live.current.settings.autoMusic) audio.current?.play(track.id);
            setToast({ title: throne ? "The Throne Room" : here.name, sub: trackById(trackFor(here.id, throne)).name });
          }
          // Footsteps on whatever is underfoot (two when running).
          if (state.player.moved === state.tick) {
            const step = stepSound(state), strides = Math.max(Math.abs(state.player.x - state.player.prev.x), Math.abs(state.player.y - state.player.prev.y));
            audio.current?.sfx(step, 0.8); if (strides > 1) setTimeout(() => audio.current?.sfx(step, 0.8), TICK_MS / 2);
          }
          ambience(state);
          // Held keys walk, turned to match the camera.
          setHeld(state, heldDirection(held.current, camera.current.angle));
          refresh();
        }
      }
      // Camera: follow the player, or drift and turn slowly over Friendhollow on the title screen.
      const player = state.player, dt = Math.min(0.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
      if (current === "title") {
        const t = now / 14000; camera.current.x = 121 + Math.cos(t) * 9; camera.current.y = 118 + Math.sin(t) * 9; camera.current.zoom = 0.85;
        camera.current.angle = reducedMotion ? 0 : Math.sin(now / 21000) * 0.6; camera.current.pitch = PITCH.classic;
      } else {
        // Arrow keys turn and tilt; the compass eases back to north.
        const keys = held.current, cam = camera.current;
        if (!isPaused) {
          const turn = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0), tilt = (keys.has("arrowup") ? 1 : 0) - (keys.has("arrowdown") ? 1 : 0);
          if (turn || tilt) cameraGoal.current = null;
          cam.angle += turn * TURN_SPEED * dt; cam.pitch = clampPitch(cam.pitch + tilt * TILT_SPEED * dt);
        }
        const goal = cameraGoal.current;
        if (goal) { cam.angle += (goal.angle - cam.angle) * 0.18; cam.pitch += (goal.pitch - cam.pitch) * 0.18; if (Math.abs(goal.angle - cam.angle) < 0.002 && Math.abs(goal.pitch - cam.pitch) < 0.002) { cam.angle = goal.angle; cam.pitch = goal.pitch; cameraGoal.current = null; } }
        if (compass.current) compass.current.style.transform = `rotate(${northAngle(cam) * 180 / Math.PI + 90}deg)`;
        const alpha = Math.min(1, (now - tickAt.current) / TICK_MS), moved = player.moved === state.tick;
        // Follow where you really are (upstairs, the storey's tiles stand over the building).
        const { x: tx, y: ty } = realPoint(state.world, moved ? player.prev.x + (player.x - player.prev.x) * alpha : player.x, moved ? player.prev.y + (player.y - player.prev.y) * alpha : player.y);
        camera.current.x += (tx - camera.current.x) * 0.35; camera.current.y += (ty - camera.current.y) * 0.35; camera.current.zoom = live.current.settings.zoom;
      }
      const ratio = node.width / VIEW.width;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
      renderScene(ctx, {
        game: state, now, tickAt: tickAt.current, camera: camera.current, friend: friend.current,
        follower: player.follower !== null ? followerSprites.current.get(player.follower) ?? null : null, canonical: CANONICAL,
        hoverTile: current === "playing" ? hoverTile.current : null, marker: marker.current, reducedMotion, hits: hits.current, fireworks: fireworks.current, chat: chat.current,
        projectiles: projectiles.current, sfx: (name, gain) => audio.current?.sfx(name as SfxName, gain),
        time: current === "playing" && live.current.settings.dayNight !== false ? timeOfDay() : null,
      });
      if (mini && current === "playing" && now - lastHud > 90) {
        lastHud = now; const size = mini.canvas.width;
        renderMinimap(mini, state, size, miniZoom.current * (size / 152), camera.current.angle);
      }
    };
    frame = requestAnimationFrame(loop);
    const stop = () => { held.current.clear(); if (game.current) setHeld(game.current, null); };
    window.addEventListener("blur", stop); document.addEventListener("visibilitychange", stop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", stop); };
  }, [phase, reducedMotion, refresh]);
  useEffect(() => { if (paused && game.current) { held.current.clear(); setHeld(game.current, null); setMenu(null); } }, [paused]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3400); return () => clearTimeout(timer); }, [toast]);
  // Level-up messages step aside on their own after a few seconds, so long skilling sessions don't pile them up.
  useEffect(() => { if (!levelUps.length) return; const timer = setTimeout(() => setLevelUps(list => list.slice(1)), 6000); return () => clearTimeout(timer); }, [levelUps]);

  // ---------- Sound: distance, footsteps, the world's ambience ----------
  const ambientClock = useRef({ fire: 0, forge: 0, water: 0, wild: 4, creature: 5 });
  /** Called once per tick: crackling fires, the forge, water, regional wildlife and idle monster calls, all by distance. */
  const ambience = (state: Game) => {
    const player = audio.current, clock = ambientClock.current, me = state.player;
    if (!player) return;
    for (const key of Object.keys(clock) as (keyof typeof clock)[]) clock[key] -= TICK_MS / 1000;
    const nearest = (points: Iterable<{ x: number; y: number }>) => { let best = Infinity; for (const p of points) best = Math.min(best, Math.hypot(p.x - me.x, p.y - me.y)); return best; };
    if (clock.fire <= 0) {
      const fires = [...state.fires, ...state.world.objects.filter(o => o.decor === "torch" && Math.abs(o.x - me.x) < 8 && Math.abs(o.y - me.y) < 8)], d = nearest(fires);
      if (d < 8) player.sfx("crackle", Math.max(0, 1 - d / 8) * (state.fires.length ? 1 : 0.5));
      clock.fire = 0.3 + Math.random() * 0.4;
    }
    if (clock.forge <= 0) {
      const d = nearest(state.world.objects.filter(o => (o.kind === "furnace" || o.kind === "range") && Math.abs(o.x - me.x) < 8 && Math.abs(o.y - me.y) < 8));
      if (d < 7) player.sfx("forge", Math.max(0, 1 - d / 7));
      clock.forge = 1.2 + Math.random();
    }
    if (clock.water <= 0) {
      let d = Infinity;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (isWater(terrainAt(state.world, me.x + dx, me.y + dy))) d = Math.min(d, Math.hypot(dx, dy));
      if (d < 5) player.sfx("water", Math.max(0, 1 - d / 5) * 0.9);
      clock.water = 2.4 + Math.random() * 1.5;
    }
    if (clock.wild <= 0) {
      const region = regionAt(state.world, me.x, me.y).id;
      const call: SfxName | null = isUnderground(me.y) ? "drip" : region === "murkmire" ? "frog" : region === "frostpeak" || region === "pale_dunes" ? "wind" : region === "glass_lake" || region === "coast" ? (Math.random() < 0.5 ? "gull" : "bird") : region === "oasis" || region === "ashen_hills" || region === "emberforge" ? null : "bird";
      if (call) player.sfx(call, 0.5 + Math.random() * 0.4);
      clock.wild = 3 + Math.random() * 6;
    }
    if (clock.creature <= 0) {
      const near = state.monsters.filter(m => !m.dead && Math.hypot(m.x - me.x, m.y - me.y) < 10);
      if (near.length) { const m = near[Math.floor(Math.random() * near.length)]; player.creature(m.def.id, "idle", nearness(state, m.x, m.y) * 0.7); }
      clock.creature = 4 + Math.random() * 5;
    }
  };

  // ---------- Input ----------
  const logicalPoint = (clientX: number, clientY: number) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) * VIEW.width / rect.width, y: (clientY - rect.top) * VIEW.height / rect.height };
  };
  const optionsAt = (x: number, y: number) => {
    const state = game.current!, tile = toTile(camera.current, x, y);
    return menuFor(state, pickAt(x, y), tile, live.current.selection);
  };
  const act = (x: number, y: number) => {
    const state = game.current;
    if (!state || live.current.paused) return;
    const options = optionsAt(x, y), first = options[0], tile = toTile(camera.current, x, y);
    if (!first) return;
    first.run(state);
    marker.current = { x: tile.x, y: tile.y, at: performance.now(), red: first.verb !== "Walk here" };
    if (live.current.selection) setSelection(null);
    audio.current?.sfx("click"); refresh();
  };
  const openContext = (x: number, y: number) => {
    const state = game.current;
    if (!state || live.current.paused) return;
    const tile = toTile(camera.current, x, y);
    setMenu({ x, y, entries: optionsAt(x, y).map(option => ({ verb: option.verb, noun: option.noun, tone: option.tone, run: () => {
      option.run(state); marker.current = { x: tile.x, y: tile.y, at: performance.now(), red: option.verb !== "Walk here" };
      if (live.current.selection) setSelection(null); refresh();
    } })) });
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!game.current || phase !== "playing") return;
    const p = logicalPoint(event.clientX, event.clientY); pointer.current = p;
    // Middle-button drag turns (left/right) and tilts (up/down) the camera.
    if (orbit.current && event.buttons & 4) {
      const start = orbit.current; cameraGoal.current = null;
      camera.current.angle = start.angle + (p.x - start.x) * 0.009; camera.current.pitch = clampPitch(start.pitch - (p.y - start.y) * 0.0018);
      return;
    }
    hoverTile.current = toTile(camera.current, p.x, p.y);
    const options = optionsAt(p.x, p.y), first = options[0], more = options.length - 1;
    const text = first ? `${first.verb}${first.noun ? ` ${first.noun}` : ""}${more > 0 ? ` / ${more} more option${more > 1 ? "s" : ""}` : ""}` : "";
    if (text !== hover) setHover(text);
  };
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    canvas.current?.focus({ preventScroll: true });
    const p = logicalPoint(event.clientX, event.clientY);
    if (event.button === 1) { event.preventDefault(); orbit.current = { x: p.x, y: p.y, angle: camera.current.angle, pitch: camera.current.pitch }; canvas.current?.setPointerCapture(event.pointerId); return; }
    if (event.pointerType === "touch") { longPress(() => openContext(p.x, p.y)); touchStart.current = { ...p, at: performance.now() }; return; }
    if (event.button === 0) { setMenu(null); act(p.x, p.y); }
  };
  const touchStart = useRef<{ x: number; y: number; at: number } | null>(null);
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button === 1) { orbit.current = null; return; }
    if (event.pointerType !== "touch" || !touchStart.current) return;
    const start = touchStart.current; touchStart.current = null; cancelLongPress();
    if (performance.now() - start.at < 450 && !menu) act(start.x, start.y);
  };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const state = game.current, target = event.target as HTMLElement | null;
      if (!state || live.current.phase !== "playing" || live.current.paused) return;
      if (target?.dataset.chat === "true" || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") { if (event.key === "Escape") target.blur(); return; }
      const key = event.key.toLowerCase();
      if (KEY_DIRECTIONS[key]) { held.current.add(key); setHeld(state, heldDirection(held.current, camera.current.angle)); event.preventDefault(); return; }
      if (CAMERA_KEYS.has(key)) { held.current.add(key); event.preventDefault(); return; }
      const fn = /^f([1-9])$/.exec(key);
      if (fn) { setTab(TABS[Number(fn[1]) - 1].id); event.preventDefault(); return; }
      if (key === "escape") { setMenu(null); setModal(null); setSelection(null); closeInterfaces(state); setLevelUps([]); refresh(); return; }
      if (key === " " || key === "spacebar") {
        if (live.current.phase === "playing") {
          if (levelUpsRef.current.length && !state.dialogue) setLevelUps(list => list.slice(1));
          else if (state.dialogue) { continueDialogue(state); refresh(); }
          event.preventDefault();
        }
        return;
      }
      if (/^[1-5]$/.test(key) && state.dialogue) { chooseOption(state, Number(key) - 1); refresh(); return; }
      if (key === "r") { toggleRun(state); refresh(); return; }
      if (key === "m") { setModal(modal => modal === "map" ? null : "map"); return; }
      if (key === "enter") { (root.current?.querySelector("[data-chat]") as HTMLInputElement | null)?.focus(); event.preventDefault(); return; }
      if (key === "i") setTab("inventory"); else if (key === "k") setTab("skills"); else if (key === "l") setTab("quests");
      else if (key === "p") setTab("prayer"); else if (key === "n") setTab("magic"); else if (key === "o") setTab("equipment");
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!held.current.delete(key)) return;
      if (game.current) setHeld(game.current, heldDirection(held.current, camera.current.angle));
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [refresh]);
  const levelUpsRef = useRef(levelUps); levelUpsRef.current = levelUps;

  const onMinimap = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const state = game.current, node = minimap.current;
    if (!state || !node || paused) return;
    const rect = node.getBoundingClientRect(), size = node.width, scale = miniZoom.current * (size / 152);
    const { x, y } = minimapTile(state, (event.clientX - rect.left) * size / rect.width - size / 2, (event.clientY - rect.top) * size / rect.height - size / 2, scale, camera.current.angle);
    walkTo(state, x, y); marker.current = { x, y, at: performance.now(), red: false }; refresh();
  };
  const say = (text: string) => {
    const state = game.current;
    if (!state) return;
    message(state, `${FAMILY_NAMES[state.player.familyId]} #${state.player.friendId}: ${text}`, "public");
    chat.current = { text, until: performance.now() + 3500 }; refresh();
  };

  // ---------- Title ----------
  const begin = () => {
    const state = game.current;
    if (!state) return;
    audio.current?.unlock(); setPhase("playing"); region.current = ""; tickAt.current = performance.now();
    const at = realPoint(state.world, state.player.x, state.player.y);
    camera.current = { x: at.x, y: at.y, zoom: settings.zoom, angle: 0, pitch: PITCH.classic };
    if (!hasSave) { state.dialogue = null; message(state, "Tip: talk to the Realm Guide by the fountain, or right-click anything to see what you can do.", "info"); }
    setTimeout(() => canvas.current?.focus({ preventScroll: true }), 50);
  };

  // ---------- Rare Caskets (simulated RF through the SDK client) ----------
  const refreshSnapshot = useCallback(async () => {
    const value = await client.read(); setSnapshot(value);
    if (game.current) setRelics(game.current, value.inventory.map(amount => Number(amount > 99n ? 99n : amount)));
    return value;
  }, [client]);
  const casket = async (task: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setCasketError("");
    try { await task(); await refreshSnapshot(); after?.(); } catch (error) { setCasketError(error instanceof Error ? error.message : "That didn't work. Try again."); } finally { setBusy(false); }
  };
  const openCaskets = async () => {
    const state = game.current;
    if (!state) return;
    await casket(async () => {
      const current = await client.read(), pending = current.plays.filter(play => play.outcomeId === null);
      const plays: readonly GamePlay[] = pending.length ? pending : await client.play(current.consumables > 5n ? 5n : current.consumables);
      const results: CasketResult[] = [];
      for (const play of plays) {
        const settled = await client.settle(play.id);
        if (settled.outcomeId === null) continue;
        const collected = collectFromCasket(state, settled.outcomeId - 1);
        results.push({ play: settled.id, outcomeId: settled.outcomeId, wardrobe: collected.wardrobe, coins: collected.coins, redeemed: false });
      }
      setReveal(results); audio.current?.sfx(results.some(result => result.outcomeId >= 3) ? "quest" : "level");
    });
    refresh();
  };

  // ---------- Adventurer card ----------
  const openCard = () => {
    const state = game.current;
    if (!state) return;
    const picture = renderCard(state, friend.current, regionAt(state.world, state.player.x, state.player.y).name);
    picture.toBlob(blob => { if (!blob) return; cardBlob.current = blob; setCardUrl(url => { if (url) URL.revokeObjectURL(url); return URL.createObjectURL(blob); }); });
    setShareStatus(""); setModal("card");
  };
  const share = (action: ShareAction) => {
    const state = game.current, blob = cardBlob.current;
    if (!state || !blob) return;
    if (hosted !== "linked") { setShareStatus("Sharing needs the Realm's own host page (the Pages link)."); return; }
    window.parent.postMessage({ type: SHARE_REQUEST, action, text: shareText(state), image: blob, filename: `rarefriends-realm-${state.player.friendId}.png` }, "*");
    setShareStatus("Working…");
  };

  // ---------- Render ----------
  const state = game.current, player = state?.player;
  // Speech blips as each dialogue line appears, pitched to the speaker.
  const line = state?.dialogue ? state.dialogue.lines[Math.min(state.dialogue.index, state.dialogue.lines.length - 1)] : null;
  const lineKey = state?.dialogue && line && state.dialogue.index < state.dialogue.lines.length ? `${state.dialogue.npc}|${state.dialogue.index}|${line.text.length}` : "";
  useEffect(() => {
    if (!lineKey || !line || !state) return;
    const who = line.who === "player" ? `${state.player.friendId}` : state.dialogue!.npc;
    audio.current?.speak([...who].reduce((sum, char) => sum + char.charCodeAt(0), 0), Math.ceil(line.text.split(" ").length / 3));
  }, [lineKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const definition = client.definition, pending = snapshot?.plays.filter(play => play.outcomeId === null).length ?? 0;
  const savedText = hosted === "linked" ? "Your adventure saves automatically for this wallet on this device." : hosted === "waiting" ? "Connecting saves…" : "Saves are off: this host doesn't provide them (use the Realm's own page).";
  return (
    <div ref={root} className="realm-game" data-phase={phase} data-tick={state?.tick ?? 0} data-region={state ? regionAt(state.world, state.player.x, state.player.y).id : ""}
      data-total={player ? totalLevel(player) : 0} data-hp={player?.hp ?? 0} data-quests={state ? questPoints(state) : 0} data-hosted={hosted}
      onContextMenu={event => event.preventDefault()}>
      <div ref={stage} className="realm-stage" style={{ width: size.width, height: size.height, transform: `scale(${size.scale})`, "--toolbar": `${Math.ceil(54 / size.scale)}px` } as CSSProperties}>
        <canvas ref={canvas} className="realm-view" tabIndex={0} aria-label="The Realm. Left-click to act, right-click for options, WASD to walk."
          style={{ width: size.width, height: size.height }}
          onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { cancelLongPress(); orbit.current = null; }}
          onMouseDown={event => { if (event.button === 1) event.preventDefault(); }} onAuxClick={event => event.preventDefault()}
          onPointerLeave={() => { hoverTile.current = null; setHover(""); }}
          onContextMenu={event => { event.preventDefault(); const p = logicalPoint(event.clientX, event.clientY); openContext(p.x, p.y); }}
          onWheel={event => { if (phase === "playing") setSettings({ ...settings, zoom: Math.max(ZOOM.min, Math.min(ZOOM.max, settings.zoom * (event.deltaY < 0 ? 1.08 : 0.93))) }); }} />

        {phase === "playing" && state && player && <>
          <div className="realm-hover" aria-hidden="true">{hover}</div>
          <div className="realm-topright">
            <Orbs game={state} onRun={() => { toggleRun(state); refresh(); }} onMap={() => setModal("map")} onZoom={delta => setSettings({ ...settings, zoom: Math.max(ZOOM.min, Math.min(ZOOM.max, settings.zoom * (delta > 0 ? 1.15 : 0.87))) })}
              onRotate={delta => { const from = cameraGoal.current?.angle ?? camera.current.angle; cameraGoal.current = { angle: from + delta, pitch: cameraGoal.current?.pitch ?? camera.current.pitch }; }} />
            <div className="realm-minimap">
              <canvas ref={minimap} width={180} height={180} onClick={onMinimap} aria-label="Minimap: click to walk, scroll to zoom"
                onWheel={event => { miniZoom.current = Math.max(1.6, Math.min(7, miniZoom.current * (event.deltaY < 0 ? 1.15 : 0.87))); }} />
              <button type="button" ref={compass} className="realm-compass" title="Face north" aria-label="Compass: face north"
                onClick={() => { const from = cameraGoal.current?.angle ?? camera.current.angle; cameraGoal.current = { angle: NORTH + Math.round((from - NORTH) / (Math.PI * 2)) * Math.PI * 2, pitch: cameraGoal.current?.pitch ?? camera.current.pitch }; }}><i aria-hidden="true">▲</i><b>N</b></button>
              {settings.dayNight !== false && (() => { const light = daylight(timeOfDay()); return <span className="realm-clock" title="Time of day">{light.label === "Night" ? "☾" : light.label === "Day" ? "☀" : "◐"} {light.label}</span>; })()}
            </div>
          </div>
          <div className="realm-drops" aria-hidden="true">
            {drops.map(drop => <span key={drop.id} style={{ animationDuration: reducedMotion ? "0s" : undefined }}><PixelIcon art={skillArt(drop.skill)} size={20} /> +{Math.round(drop.amount).toLocaleString()}</span>)}
          </div>
          {toast && <div className="realm-toast" role="status"><b>{toast.title}</b>{toast.sub && <small>♪ {toast.sub}</small>}</div>}
          {dead && <div className="realm-dead" role="alert">Oh dear, you are dead!</div>}

          <div className="realm-bottom">
            {state.dialogue ? <DialogueBox game={state} sprites={friend.current} canonical={CANONICAL} refresh={refresh} />
              : levelUps.length ? <LevelUpBox skill={levelUps[0].skill} level={levelUps[0].level} onClose={() => setLevelUps(list => list.slice(1))} />
              : state.ui.production ? <ProductionBox game={state} refresh={refresh} />
              : <ChatBox messages={state.messages} onSend={say} />}
          </div>
          <button type="button" className="realm-side-toggle" aria-expanded={sideOpen} onClick={() => setSideOpen(open => !open)}>{sideOpen ? "▾" : "▴"} Panels</button>
          {sideOpen && <SidePanel game={state} tab={tab} setTab={setTab} selection={selection} setSelection={setSelection} openMenu={(x, y, entries) => setMenu({ x, y, entries })}
            refresh={refresh} roster={roster} rosterState={rosterState} friendSprites={followerSprites.current} loadFriend={loadFriendSprite} settings={settings} setSettings={setSettings}
            friend={friend.current} trackName={audio.current?.trackName ?? ""} trackId={audio.current?.trackId ?? ""} playTrack={id => { audio.current?.play(id as TrackId); audio.current?.unlock(); setSettings({ ...settings, autoMusic: false }); }} openCard={openCard} openHelp={() => setModal("help")} paused={paused} saved={savedText}
            relicCounts={snapshot?.inventory.map(Number) ?? [0, 0, 0, 0]} openCaskets={() => setModal("caskets")} />}
          {selection && <div className="realm-selection" role="status">{selection.kind === "item" ? `Use ${player.inventory[selection.slot] ? itemName(player.inventory[selection.slot]!.id) : "item"} ->` : `Cast ${SPELLS.find(spell => spell.id === selection.spell)?.name ?? "spell"} ->`} pick a target <button type="button" onClick={() => setSelection(null)}>Cancel</button></div>}

          {state.ui.bank && <BankModal game={state} refresh={refresh} onClose={() => { state.ui.bank = false; refresh(); }} openMenu={(x, y, entries) => setMenu({ x, y, entries })} />}
          <LampModal game={state} refresh={refresh} />
          {state.ui.shop === "__market" && (
            <Modal title="Rare Market" onClose={() => { state.ui.shop = null; refresh(); }} wide>
              <p className="realm-sim">Simulated $RAREFRIENDS. No real tokens, contracts or transactions. Balance: <b>{snapshot ? rf(snapshot.rfBalance) : "…"}</b></p>
              <p>RF buys one thing, the <b>Rare Casket</b>, so every bundle buys caskets (open them at any casket chest) and adds its goods on top. Traders in Friendhollow, Emberforge, the Oasis, Frostpeak and on Pike's Pier.</p>
              <ul className="realm-market">{RF_BUNDLES.map(bundle => {
                const choices = bundle.id === "tailor" ? tailorChoices(state) : [], pick = choices.some(piece => piece.id === tailorPick) ? tailorPick : choices[0]?.id ?? "";
                return <li key={bundle.id}><div><b>{bundle.name}</b><small>{bundle.text} Includes {bundle.caskets} Rare Casket{bundle.caskets > 1 ? "s" : ""}.</small></div>
                  {bundle.id === "tailor" && (choices.length ? <select aria-label="Wardrobe piece" value={pick} onChange={event => setTailorPick(event.target.value)}>{choices.map(piece => <option key={piece.id} value={piece.id}>{piece.name}</option>)}</select> : <small>You own them all!</small>)}
                  <button type="button" className="realm-primary" disabled={busy || paused || (bundle.id === "tailor" && !choices.length)}
                    onClick={() => void casket(() => client.buy(BigInt(bundle.caskets)), () => { grantBundle(state, bundle.id, pick); audio.current?.sfx("coins"); refresh(); })}>Buy · {rf(definition.price * BigInt(bundle.caskets))}</button></li>;
              })}</ul>
              {casketError && <p className="realm-error" role="alert">{casketError}</p>}
              <div className="realm-buttons"><button type="button" onClick={() => { state.ui.shop = "__caskets"; refresh(); }}>Open your caskets ({(snapshot?.consumables ?? 0n).toString()} waiting)</button></div>
            </Modal>
          )}
          {state.ui.shop && state.ui.shop !== "__caskets" && state.ui.shop !== "__market" && <ShopModal game={state} shopId={state.ui.shop} refresh={refresh} onClose={() => { state.ui.shop = null; refresh(); }} />}
          {(modal === "caskets" || state.ui.shop === "__caskets") && (
            <Modal title="Rare Caskets" onClose={() => { setModal(null); state.ui.shop = null; setReveal(null); refresh(); }} wide>
              <p className="realm-sim">Simulated $RAREFRIENDS. No real tokens, contracts or transactions. Balance: <b>{snapshot ? rf(snapshot.rfBalance) : "…"}</b></p>
              <p>Each casket costs <b>{rf(definition.price)}</b> and holds a <b>Rare Relic</b> (keep it for a bonus, or redeem it for RF) plus a <b>wardrobe piece</b> for your Friend. Duplicates become coins.</p>
              <table className="realm-odds">
                <thead><tr><th>Relic</th><th>Chance</th><th>RF value</th><th>Kept bonus</th><th>Wardrobe</th></tr></thead>
                <tbody>{definition.outcomes.map((outcome, index) => <tr key={outcome.name}><td>{outcome.name}</td><td>{(outcome.chanceBps / 100).toFixed(0)}%</td><td>{rf(outcome.reward)}</td><td>{RELICS[index].text}</td>
                  <td>{WARDROBE.filter(piece => piece.tier === index).map(piece => piece.name).join(", ")}</td></tr>)}</tbody>
              </table>
              <p className="realm-note">Expected value {rf(expectedReward(definition))} per casket · top prize {rf(maximumPrize(definition))} · every casket reserves its backing, so redemptions stay funded.</p>
              <div className="realm-buttons">
                <button type="button" className="realm-primary" disabled={busy || paused} onClick={() => void casket(() => client.buy(1n), () => audio.current?.sfx("coins"))}>Buy 1 · {rf(definition.price)}</button>
                <button type="button" disabled={busy || paused} onClick={() => void casket(() => client.buy(5n), () => audio.current?.sfx("coins"))}>Buy 5 · {rf(definition.price * 5n)}</button>
                <button type="button" className="realm-primary" disabled={busy || paused || (!snapshot?.consumables && !pending)} onClick={() => void openCaskets()}>Open {Math.min(5, Number(snapshot?.consumables ?? 0n) + pending) || ""} casket{(Number(snapshot?.consumables ?? 0n) + pending) === 1 ? "" : "s"}</button>
              </div>
              {casketError && <p className="realm-error" role="alert">{casketError}</p>}
              {reveal && <div className="realm-reveal">{reveal.map(result => {
                const outcome = definition.outcomes[result.outcomeId - 1], piece = WARDROBE.find(entry => entry.id === result.wardrobe);
                return <div key={result.play.toString()} className={`tier-${result.outcomeId}`}><b>{outcome.name}</b><small>{piece ? `Wardrobe: ${piece.name}` : `+${result.coins} coins`}</small>
                  <button type="button" disabled={busy || result.redeemed} onClick={() => void casket(() => client.redeem(result.outcomeId, 1n), () => { setReveal(list => list?.map(item => item.play === result.play ? { ...item, redeemed: true } : item) ?? null); audio.current?.sfx("coins"); })}>{result.redeemed ? "Redeemed" : `Redeem · ${rf(outcome.reward)}`}</button></div>;
              })}</div>}
              <h3>Your relics</h3>
              <ul className="realm-relics">{definition.outcomes.map((outcome, index) => <li key={outcome.name}><b>{outcome.name} × {(snapshot?.inventory[index] ?? 0n).toString()}</b><small>{RELICS[index].text}{(snapshot?.inventory[index] ?? 0n) > 0n ? " · active" : ""}</small>
                <button type="button" disabled={busy || paused || !snapshot || snapshot.inventory[index] === 0n} onClick={() => void casket(() => client.redeem(index + 1, 1n))}>Redeem · {rf(outcome.reward)}</button></li>)}</ul>
            </Modal>
          )}
          {modal === "map" && <WorldMapModal game={state} onClose={() => setModal(null)} onTravel={(x, y) => { setModal(null); walkTo(state, x, y); marker.current = { x, y, at: performance.now(), red: false }; refresh(); }} />}
          {modal === "help" && <HelpModal onClose={() => setModal(null)} />}
          {modal === "card" && (
            <Modal title="Adventurer card" onClose={() => setModal(null)} wide>
              {cardUrl && <img className="realm-card" src={cardUrl} alt={`Adventurer card: Friend #${player.friendId}, total level ${totalLevel(player)}, combat ${combatLevel(player)}`} />}
              <div className="realm-buttons">
                <button type="button" className="realm-primary" onClick={() => share("post")}>Post to X</button>
                <button type="button" onClick={() => share("copy")}>Copy picture</button>
                <button type="button" onClick={() => share("save")}>Save picture</button>
              </div>
              {shareStatus && <p className="realm-note" role="status">{shareStatus}</p>}
              <p className="realm-note">Post text: “{shareText(state)}”</p>
            </Modal>
          )}
          {quest && (
            <Modal title="Quest complete!" onClose={() => setQuest(null)}>
              <div className="realm-quest-done"><span aria-hidden="true">✦</span><h3>{QUESTS.find(entry => entry.id === quest)?.name}</h3>
                <p>Quest points: <b>{questPoints(state)}</b> / {MAX_QUEST_POINTS}</p><p className="realm-note">Rewards are in your chat and inventory.</p>
                <button type="button" className="realm-primary" onClick={() => setQuest(null)}>Continue</button></div>
            </Modal>
          )}
          {menu && <ContextMenu x={menu.x} y={menu.y} entries={menu.entries} onClose={() => setMenu(null)} />}
          {paused && <div className="realm-paused" role="status">Paused</div>}
        </>}

        {phase === "title" && state && player && (
          <div className="realm-title">
            <div className="realm-logo"><small>An old-school adventure for your Rare Friend</small><h1>RareFriends<span>Realm</span></h1></div>
            <div className="realm-title-card">
              <FriendPortrait sprites={friend.current} size={96} worn={player.worn} />
              <div>
                <h2>Friend #{player.friendId}</h2>
                <p><b>{FAMILY_NAMES[player.familyId]}</b>: {FAMILY_PERKS[player.familyId].title}. {FAMILY_PERKS[player.familyId].text}</p>
                {hasSave ? <p className="realm-save">Saved adventure: total level <b>{hasSave.total}</b> · combat <b>{hasSave.combat}</b> · <b>{hasSave.qp}</b> quest points · in {hasSave.where}</p>
                  : hosted === "waiting" ? <p className="realm-muted">Looking for this wallet's saved adventure…</p> : <p className="realm-muted">A new adventure: 15 skills, 6 quests, one large world.</p>}
              </div>
            </div>
            <div className="realm-buttons center">
              <button type="button" className="realm-primary big" onClick={begin}>{hasSave ? "Continue your adventure" : "Begin your adventure"}</button>
              {audio.current?.ready || !settings.music
                ? <button type="button" onClick={() => { const next = { ...settings, music: !settings.music }; setSettings(next); }} aria-pressed={settings.music}>{settings.music ? "♪ Music on" : "♪ Music off"}</button>
                : <button type="button" onClick={() => setSettings({ ...settings })}>♪ Start the music</button>}
              <button type="button" onClick={() => setModal("help")}>How to play</button>
            </div>
            <p className="realm-title-foot">Now playing: {trackById("theme").name} · Simulated $RAREFRIENDS · Saves per wallet on this device</p>
            {modal === "help" && <HelpModal onClose={() => setModal(null)} />}
          </div>
        )}
        {(phase === "loading" || phase === "failed") && (
          <div className="realm-status" role="status">
            <span className="realm-status-glyph" aria-hidden="true">⚔</span>
            <p>{status}</p>
            {phase === "failed" && <button type="button" onClick={() => location.reload()}>Try again</button>}
          </div>
        )}
      </div>
    </div>
  );
}
const itemName = (id: string) => item(id).name;
/** How loud something at (x, y) is for you (1 beside you, 0 twelve tiles away). */
function nearness(state: Game, x: number, y: number) { return Math.max(0, 1 - Math.hypot(x - state.player.x, y - state.player.y) / 12); }
function stepSound(state: Game): SfxName {
  const terrain = terrainAt(state.world, state.player.x, state.player.y);
  if (terrain === T.WOOD || terrain === T.BRIDGE || terrain === T.CARPET) return "step_wood";
  if (terrain === T.COBBLE || terrain === T.STONE || terrain === T.DUNGEON || terrain === T.GRAVEL) return "step_stone";
  if (terrain === T.SAND) return "step_sand";
  if (terrain === T.SNOW || terrain === T.ICE) return "step_snow";
  if (terrain === T.SWAMP) return "step_swamp";
  return "step_grass";
}
const clampPitch = (pitch: number) => Math.max(PITCH.min, Math.min(PITCH.max, pitch));
/** Held WASD as a world direction: screen up/down/left/right, turned back through the camera's angle. */
function heldDirection(keys: ReadonlySet<string>, angle: number) {
  let sx = 0, sy = 0;
  for (const key of keys) { const direction = KEY_DIRECTIONS[key]; if (direction) { sx += direction[0]; sy += direction[1]; } }
  if (!sx && !sy) return null;
  const rx = (sx + sy) / 2, ry = (sy - sx) / 2, c = Math.cos(-angle), s = Math.sin(-angle);
  return { dx: rx * c - ry * s, dy: rx * s + ry * c };
}
