"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { formatGameAmount } from "@rarefriends/friendsdk/ui";
import { expectedReward, maximumPrize, type GamePlay, type GameSnapshot } from "@rarefriends/friendsdk/game";
import { createFriendReader, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { FAMILY_NAMES, FAMILY_PERKS, RELICS, SKILL_ICONS, SPELLS, WARDROBE, item, type Skill } from "./data.ts";
import { QUESTS, questPoints, MAX_QUEST_POINTS } from "./content.ts";
import { TICK_MS, combatLevel, createGame, message, totalLevel, type Game, type Projectile } from "./state.ts";
import {
  chooseOption, closeInterfaces, collectFromCasket, continueDialogue, menuFor, restore, serialize, setFollower, setHeld, setRelics, tick, toggleRun, walkTo, type OwnedFriend, type Selection,
} from "./engine.ts";
import { VIEW, pickAt, renderMinimap, renderScene, toScreen, toTile, type Camera, type ClickMarker, type Firework, type HitSplat } from "./render.ts";
import {
  BankModal, ChatBox, ContextMenu, DialogueBox, FriendPortrait, HelpModal, LevelUpBox, Modal, Orbs, ProductionBox, ShopModal, SidePanel, TABS, WorldMapModal,
  cancelLongPress, longPress, type MenuEntry, type Settings, type Tab,
} from "./panels.tsx";
import { REGULAR_SPRITES } from "./regulars.ts";
import { HOST_HELLO, HOST_STATE, SAVE_WRITE, SHARE_REQUEST, SHARE_RESULT, parseRoster, type ShareAction, type ShareOutcome } from "./roster.ts";
import { RealmAudio, trackFor, trackById } from "./audio.ts";
import { renderCard, shareText } from "./card.ts";
import { regionAt } from "./world.ts";
import "@rarefriends/friendsdk/frame.css";
import "./style.css";

const rf = (value: bigint) => `${formatGameAmount(value, 18)} RF`;
type Phase = "loading" | "title" | "playing" | "failed";
type Modal = "caskets" | "map" | "card" | "help" | null;
type XpDrop = { id: number; skill: Skill; amount: number; at: number };
type CasketResult = { play: bigint; outcomeId: number; wardrobe: string | null; coins: number; redeemed: boolean };
const CANONICAL = new Map<number, GenerationSprites>(REGULAR_SPRITES.map(sprites => [Number(sprites.tokenId), sprites]));
const KEY_DIRECTIONS: Record<string, [number, number]> = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
const DEFAULT_SETTINGS: Settings = { music: true, sfx: true, musicVolume: 0.7, sfxVolume: 0.8, zoom: 0.8, shiftDrop: false };

/** RareFriends Realm. The SDK runtime supplies wallet connection, the verified owned Friend and the fixed (simulated) RF client. */
export default function RareFriendsRealm({ friendId, client, paused }: GameComponentProps) {
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), minimap = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null), friend = useRef<GenerationSprites | null>(null), audio = useRef<RealmAudio | null>(null);
  const followerSprites = useRef(new Map<number, GenerationSprites>()), loadingSprites = useRef(new Set<number>());
  const camera = useRef<Camera>({ x: 121, y: 121, zoom: DEFAULT_SETTINGS.zoom }), tickAt = useRef(0), hits = useRef<HitSplat[]>([]), fireworks = useRef<Firework[]>([]);
  const projectiles = useRef<Projectile[]>([]), marker = useRef<ClickMarker | null>(null), hoverTile = useRef<{ x: number; y: number } | null>(null), chat = useRef<{ text: string; until: number } | null>(null);
  const held = useRef(new Set<string>()), linked = useRef(false), lastSave = useRef(""), region = useRef(""), epoch = useRef(0), pointer = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("loading"), [status, setStatus] = useState("Waking your Friend and unfolding the Realm…");
  const [, setVersion] = useState(0), [tab, setTab] = useState<Tab>("inventory"), [selection, setSelection] = useState<Selection>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; entries: MenuEntry[] } | null>(null), [modal, setModal] = useState<Modal>(null);
  const [hover, setHover] = useState(""), [toast, setToast] = useState<{ title: string; sub?: string } | null>(null), [drops, setDrops] = useState<XpDrop[]>([]);
  const [levelUps, setLevelUps] = useState<{ skill: Skill; level: number }[]>([]), [quest, setQuest] = useState<string | null>(null), [dead, setDead] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS), [roster, setRoster] = useState<OwnedFriend[]>([]), [rosterState, setRosterState] = useState<"waiting" | "ready" | "none">("waiting");
  const [hosted, setHosted] = useState<"waiting" | "linked" | "none">("waiting"), [hasSave, setHasSave] = useState<{ total: number; combat: number; qp: number; where: string } | null>(null);
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
    setSettingsState(next); camera.current.zoom = next.zoom;
    const player = audio.current;
    if (player) { player.setMusic(next.music); player.setSfx(next.sfx); player.setVolumes(next.musicVolume, next.sfxVolume); player.unlock(); }
  }, []);
  useEffect(() => {
    const wake = () => { const player = audio.current, s = live.current.settings; if (!player) return; player.setMusic(s.music); player.setSfx(s.sfx); player.setVolumes(s.musicVolume, s.sfxVolume); player.unlock(); };
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
            if (live.current.phase === "playing") { message(state, "Welcome back! This wallet's adventure has been restored.", "info"); camera.current.x = state.player.x; camera.current.y = state.player.y; }
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
      game.current = state; camera.current = { x: state.world.places.spawn.x, y: state.world.places.spawn.y, zoom: live.current.settings.zoom };
      setRelics(state, value.inventory.map(amount => Number(amount > 99n ? 99n : amount))); setSnapshot(value);
      setPhase("title");
      // Automated browser tests only (navigator.webdriver): a handle for driving the camera and state.
      if (navigator.webdriver) (window as unknown as { __realm?: unknown }).__realm = {
        game: () => game.current, refresh: () => refresh(), screenOf: (x: number, y: number) => {
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
    let frame = 0, lastHud = 0, dropId = 0;
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
            const first = region.current === ""; region.current = key;
            audio.current?.play(trackFor(here.id, throne));
            if (!first) setToast({ title: throne ? "The Throne Room" : here.name, sub: trackById(trackFor(here.id, throne)).name });
          }
          // Held keys walk.
          setHeld(state, heldDirection(held.current));
          refresh();
        }
      }
      // Camera: follow the player, or drift over Friendhollow on the title screen.
      const player = state.player;
      if (current === "title") {
        const t = now / 14000; camera.current.x = 121 + Math.cos(t) * 9; camera.current.y = 118 + Math.sin(t) * 9; camera.current.zoom = 0.85;
      } else {
        const alpha = Math.min(1, (now - tickAt.current) / TICK_MS), moved = player.moved === state.tick;
        const tx = moved ? player.prev.x + (player.x - player.prev.x) * alpha : player.x, ty = moved ? player.prev.y + (player.y - player.prev.y) * alpha : player.y;
        camera.current.x += (tx - camera.current.x) * 0.35; camera.current.y += (ty - camera.current.y) * 0.35; camera.current.zoom = live.current.settings.zoom;
      }
      const ratio = node.width / VIEW.width;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
      renderScene(ctx, {
        game: state, now, tickAt: tickAt.current, camera: camera.current, friend: friend.current,
        follower: player.follower !== null ? followerSprites.current.get(player.follower) ?? null : null, canonical: CANONICAL,
        hoverTile: current === "playing" ? hoverTile.current : null, marker: marker.current, reducedMotion, hits: hits.current, fireworks: fireworks.current, chat: chat.current,
        projectiles: projectiles.current,
      });
      if (mini && current === "playing" && now - lastHud > 90) {
        lastHud = now; const size = mini.canvas.width;
        renderMinimap(mini, state, size, 3.2 * (size / 152), now);
      }
    };
    frame = requestAnimationFrame(loop);
    const stop = () => { held.current.clear(); if (game.current) setHeld(game.current, null); };
    window.addEventListener("blur", stop); document.addEventListener("visibilitychange", stop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", stop); };
  }, [phase, reducedMotion, refresh]);
  useEffect(() => { if (paused && game.current) { held.current.clear(); setHeld(game.current, null); setMenu(null); } }, [paused]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3400); return () => clearTimeout(timer); }, [toast]);

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
    hoverTile.current = toTile(camera.current, p.x, p.y);
    const options = optionsAt(p.x, p.y), first = options[0], more = options.length - 1;
    const text = first ? `${first.verb}${first.noun ? ` ${first.noun}` : ""}${more > 0 ? ` / ${more} more option${more > 1 ? "s" : ""}` : ""}` : "";
    if (text !== hover) setHover(text);
  };
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    canvas.current?.focus({ preventScroll: true });
    const p = logicalPoint(event.clientX, event.clientY);
    if (event.pointerType === "touch") { longPress(() => openContext(p.x, p.y)); touchStart.current = { ...p, at: performance.now() }; return; }
    if (event.button === 0) { setMenu(null); act(p.x, p.y); }
  };
  const touchStart = useRef<{ x: number; y: number; at: number } | null>(null);
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
      if (KEY_DIRECTIONS[key]) { held.current.add(key); setHeld(state, heldDirection(held.current)); event.preventDefault(); return; }
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
      if (game.current) setHeld(game.current, heldDirection(held.current));
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [refresh]);
  const levelUpsRef = useRef(levelUps); levelUpsRef.current = levelUps;

  const onMinimap = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const state = game.current, node = minimap.current;
    if (!state || !node || paused) return;
    const rect = node.getBoundingClientRect(), size = node.width, scale = 3.2 * (size / 152);
    const rx = ((event.clientX - rect.left) * size / rect.width - size / 2) / scale, ry = ((event.clientY - rect.top) * size / rect.height - size / 2) / scale;
    const x = Math.round(state.player.x + (rx + ry) * Math.SQRT1_2), y = Math.round(state.player.y + (ry - rx) * Math.SQRT1_2);
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
    camera.current = { x: state.player.x, y: state.player.y, zoom: settings.zoom };
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
  const definition = client.definition, pending = snapshot?.plays.filter(play => play.outcomeId === null).length ?? 0;
  const savedText = hosted === "linked" ? "Your adventure saves automatically for this wallet on this device." : hosted === "waiting" ? "Connecting saves…" : "Saves are off: this host doesn't provide them (use the Realm's own page).";
  return (
    <div ref={root} className="realm-game" data-phase={phase} data-tick={state?.tick ?? 0} data-region={state ? regionAt(state.world, state.player.x, state.player.y).id : ""}
      data-total={player ? totalLevel(player) : 0} data-hp={player?.hp ?? 0} data-quests={state ? questPoints(state) : 0} data-hosted={hosted}
      onContextMenu={event => event.preventDefault()}>
      <div ref={stage} className="realm-stage" style={{ width: size.width, height: size.height, transform: `scale(${size.scale})`, "--toolbar": `${Math.ceil(54 / size.scale)}px` } as CSSProperties}>
        <canvas ref={canvas} className="realm-view" tabIndex={0} aria-label="The Realm. Left-click to act, right-click for options, WASD to walk."
          style={{ width: size.width, height: size.height }}
          onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => cancelLongPress()}
          onPointerLeave={() => { hoverTile.current = null; setHover(""); }}
          onContextMenu={event => { event.preventDefault(); const p = logicalPoint(event.clientX, event.clientY); openContext(p.x, p.y); }}
          onWheel={event => { if (phase === "playing") setSettings({ ...settings, zoom: Math.max(0.55, Math.min(1.6, settings.zoom * (event.deltaY < 0 ? 1.08 : 0.93))) }); }} />

        {phase === "playing" && state && player && <>
          <div className="realm-hover" aria-hidden="true">{hover}</div>
          <div className="realm-topright">
            <Orbs game={state} onRun={() => { toggleRun(state); refresh(); }} onMap={() => setModal("map")} onZoom={delta => setSettings({ ...settings, zoom: Math.max(0.55, Math.min(1.6, settings.zoom + delta)) })} />
            <div className="realm-minimap">
              <canvas ref={minimap} width={152} height={152} onClick={onMinimap} aria-label="Minimap: click to walk" />
              <span className="realm-compass" aria-hidden="true">N</span>
            </div>
          </div>
          <div className="realm-drops" aria-hidden="true">
            {drops.map(drop => <span key={drop.id} style={{ animationDuration: reducedMotion ? "0s" : undefined }}>{SKILL_ICONS[drop.skill]} +{Math.round(drop.amount).toLocaleString()}</span>)}
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
            trackName={audio.current?.trackName ?? ""} openCard={openCard} openHelp={() => setModal("help")} paused={paused} saved={savedText}
            relicCounts={snapshot?.inventory.map(Number) ?? [0, 0, 0, 0]} openCaskets={() => setModal("caskets")} />}
          {selection && <div className="realm-selection" role="status">{selection.kind === "item" ? `Use ${player.inventory[selection.slot] ? itemName(player.inventory[selection.slot]!.id) : "item"} ->` : `Cast ${SPELLS.find(spell => spell.id === selection.spell)?.name ?? "spell"} ->`} pick a target <button type="button" onClick={() => setSelection(null)}>Cancel</button></div>}

          {state.ui.bank && <BankModal game={state} refresh={refresh} onClose={() => { state.ui.bank = false; refresh(); }} openMenu={(x, y, entries) => setMenu({ x, y, entries })} />}
          {state.ui.shop && state.ui.shop !== "__caskets" && <ShopModal game={state} shopId={state.ui.shop} refresh={refresh} onClose={() => { state.ui.shop = null; refresh(); }} />}
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
              <FriendPortrait sprites={friend.current} size={96} />
              <div>
                <h2>Friend #{player.friendId}</h2>
                <p><b>{FAMILY_NAMES[player.familyId]}</b>: {FAMILY_PERKS[player.familyId].title}. {FAMILY_PERKS[player.familyId].text}</p>
                {hasSave ? <p className="realm-save">Saved adventure: total level <b>{hasSave.total}</b> · combat <b>{hasSave.combat}</b> · <b>{hasSave.qp}</b> quest points · in {hasSave.where}</p>
                  : hosted === "waiting" ? <p className="realm-muted">Looking for this wallet's saved adventure…</p> : <p className="realm-muted">A new adventure: 15 skills, 6 quests, one large world.</p>}
              </div>
            </div>
            <div className="realm-buttons center">
              <button type="button" className="realm-primary big" onClick={begin}>{hasSave ? "Continue your adventure" : "Begin your adventure"}</button>
              <button type="button" onClick={() => { const next = { ...settings, music: !settings.music }; setSettings(next); }} aria-pressed={settings.music}>{settings.music ? "♪ Music on" : "♪ Music off"}</button>
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
function heldDirection(keys: ReadonlySet<string>) {
  let dx = 0, dy = 0;
  for (const key of keys) { const direction = KEY_DIRECTIONS[key]; if (direction) { dx += direction[0]; dy += direction[1]; } }
  dx = Math.sign(dx); dy = Math.sign(dy);
  return dx || dy ? { dx, dy } : null;
}
