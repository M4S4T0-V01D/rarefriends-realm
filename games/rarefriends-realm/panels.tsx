/** The Realm's interface: side tabs, chat and dialogue, bank, shops, production, map and more. */
import React, { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import {
  EMOTES, EQUIP_SLOTS, FAMILY_NAMES, FAMILY_PERKS, PRAYERS, RELICS, SHOPS, SKILLS, SKILL_ICONS, SKILL_NAMES, SPELLS, WARDROBE, XP_TABLE, item, levelForXp,
  type EquipSlot, type Skill, mountDef, PETS,
} from "./data.ts";
import { mountArt } from "./mountart.ts";
import { CHEST_REWARD, DAY_MS, challengeProgress, challengeReward, challengeText, claimChallenge, claimChest, claimStreak, dailyWaiting, rewardText, rollDaily, streakReward, streakStatus } from "./daily.ts";
import { LATEST_UPDATE, UPDATES } from "./updates.ts";
import { FIRST_STEPS, currentStep } from "./firststeps.ts";
import { bossWindow } from "./worldboss.ts";
import { ACHIEVEMENTS, achieved } from "./achievements.ts";
import { hiscores } from "./hiscores.ts";
import { petArt } from "./petart.ts";
import { MAX_QUEST_POINTS, NPCS, QUESTS, finalStage, questPoints } from "./content.ts";
import {
  BANK_TABS, CONTAINERS, SATCHEL, bankDeposit, emptyToBank, fillFromBank, bankDepositAll, bankDepositWorn, bankInOrder, bankMove, bankTabs, bankWithdraw, bonuses, combatLevel, count, isStaffEquipped, maxHp, maxPrayer, message, totalLevel, totalXp,
  weapon, xpMultiplier, type Game, type Message, type Recipe, type Slot,
} from "./state.ts";
import {
  bestArrow, bowRange, emoteProblem, performEmote, applyReferral, shopBuys, buy, buyPrice, canCast, capeProblem, castSpell, rangedMaxHit, rubLamp, chooseOption, continueDialogue, dialogueAtOptions, itemOptions, playerMaxHit, recipeProblem, sell, sellPrice,
  castOnItem, satchelCheck, satchelEmpty, satchelFill, setFollower, setPet, setStyle, startProduction, swapSlots, toggleRun, togglePrayer, toggleWorn, unequip, useItemOnItem, type OwnedFriend, type Selection,
} from "./engine.ts";
import { friendRows, renderWorldMap } from "./render.ts";
import { isUnderground, realPoint } from "./world.ts";
import type { NetState } from "./net.ts";
import type { TradeView } from "./trade.ts";
import { recipeBook, skillGuide } from "./guide.ts";
import { artUrl, emoteArt, itemArt, orbArt, prayerArt, skillArt, spellArt, tabArt, type TabIcon } from "./icons.ts";
import { friendSprite } from "./sprites.ts";
import { figureArt } from "./wardrobe.ts";
import { TRACKS } from "./audio.ts";

// ---------- Item icons ----------
export const itemIconUrl = (id: string) => artUrl(itemArt(item(id).icon));
const shortCount = (n: number) => n >= 10_000_000 ? `${Math.floor(n / 1_000_000)}M` : n >= 100_000 ? `${Math.floor(n / 1000)}K` : String(n);
const countColor = (n: number) => n >= 10_000_000 ? "#9fe0a8" : n >= 100_000 ? "#fff" : "#f2e28f";
export function ItemIcon({ slot, size = 46, title, bare }: { slot: Slot; size?: number; title?: string; bare?: boolean }) {
  const stack = !bare && (item(slot.id).stackable || slot.n > 1);
  return (
    <span className="realm-item" style={{ width: size, height: size }} title={title ?? item(slot.id).name}>
      <img src={itemIconUrl(slot.id)} alt="" width={size} height={size} draggable={false} className="pixel" />
      {stack && <b style={{ color: countColor(slot.n) }}>{shortCount(slot.n)}</b>}
    </span>
  );
}

/** A pixel-art icon, scaled up crisply. */
export function PixelIcon({ art, size, label }: { art: HTMLCanvasElement; size: number; label?: string }) {
  return <img className="pixel" src={artUrl(art)} width={size} height={size} alt={label ?? ""} aria-hidden={label ? undefined : true} draggable={false} />;
}

/** A Friend drawn from its mask (canonical or procedural). */
export function FriendPortrait({ sprites, family, seed, size = 48, worn = [] }: { sprites?: GenerationSprites | null; family?: number; seed?: number; size?: number; worn?: readonly string[] }) {
  const ref = useRef<HTMLCanvasElement>(null), wornKey = worn.join(",");
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rows = sprites ? friendRows(sprites, "down", false, 0) : friendSprite(family ?? 0, seed ?? 1).idle, art = figureArt(rows, worn, "down");
    const px = Math.max(1, Math.floor(size / Math.max(art.width, art.height)));
    canvas.width = canvas.height = size; ctx.clearRect(0, 0, size, size); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, Math.round((size - art.width * px) / 2), Math.round((size - art.height * px) / 2 + px), art.width * px, art.height * px);
  }, [sprites, family, seed, size, wornKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="realm-portrait" width={size} height={size} aria-hidden="true" />;
}

// ---------- Context menu ----------
export type MenuEntry = { verb: string; noun?: string; tone?: string; run: () => void };
type OpenMenu = (x: number, y: number, entries: MenuEntry[]) => void;
/** Right-click (or long-press on a phone) handlers that open the Choose Option menu for anything in an interface. */
export function rightClick(openMenu: OpenMenu | undefined, entries: () => MenuEntry[]) {
  const open = (target: Element, clientX: number, clientY: number) => {
    const list = entries();
    if (!openMenu || !list.length) return;
    const [x, y] = stagePoint(target, clientX, clientY); openMenu(x, y, list);
  };
  return {
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => { event.preventDefault(); event.stopPropagation(); open(event.currentTarget, event.clientX, event.clientY); },
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => { const touch = event.touches[0], target = event.currentTarget; longPress(() => open(target, touch.clientX, touch.clientY)); },
    onTouchEnd: cancelLongPress, onTouchMove: cancelLongPress,
  };
}
const examine = (game: Game, id: string, refresh: () => void): MenuEntry => ({ verb: "Examine", noun: item(id).name, tone: "item", run: () => { message(game, item(id).examine); refresh(); } });
export function ContextMenu({ x, y, entries, onClose }: { x: number; y: number; entries: MenuEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  useEffect(() => {
    const node = ref.current, parent = node?.offsetParent as HTMLElement | null;
    if (!node || !parent) return;
    const w = node.offsetWidth, h = node.offsetHeight, pw = parent.clientWidth, ph = parent.clientHeight;
    setPosition({ x: Math.max(2, Math.min(x - w / 2, pw - w - 2)), y: Math.max(2, Math.min(y - 8, ph - h - 2)) });
  }, [x, y]);
  return (
    <div ref={ref} className="realm-menu" role="menu" style={{ left: position.x, top: position.y }} onMouseLeave={onClose} onContextMenu={event => event.preventDefault()}>
      <div className="realm-menu-title">Choose Option</div>
      {entries.map((entry, index) => (
        <button key={index} type="button" role="menuitem" onClick={() => { onClose(); entry.run(); }}>
          <span>{entry.verb}</span>{entry.noun ? <> <span className={`tone-${entry.tone ?? "plain"}`}>{entry.noun}</span></> : null}
        </button>
      ))}
      <button type="button" role="menuitem" onClick={onClose}><span>Cancel</span></button>
    </div>
  );
}

// ---------- Side panel ----------
export type Tab = "combat" | "skills" | "quests" | "inventory" | "equipment" | "prayer" | "magic" | "friends" | "settings" | "emotes";
export const TABS: readonly { id: Tab; label: string; glyph: string; key: string }[] = [
  { id: "combat", label: "Combat options", glyph: "⚔", key: "F1" }, { id: "skills", label: "Skills", glyph: "▦", key: "F2" }, { id: "quests", label: "Quest journal", glyph: "✎", key: "F3" },
  { id: "inventory", label: "Inventory", glyph: "▣", key: "F4" }, { id: "equipment", label: "Worn equipment", glyph: "⛨", key: "F5" }, { id: "prayer", label: "Prayer", glyph: "✚", key: "F6" },
  { id: "magic", label: "Magic", glyph: "✦", key: "F7" }, { id: "friends", label: "Friends and wardrobe", glyph: "☺", key: "F8" }, { id: "settings", label: "Settings", glyph: "⚙", key: "F9" },
  { id: "emotes", label: "Emotes", glyph: "☺", key: "F10" },
];
export type Settings = { music: boolean; sfx: boolean; musicVolume: number; sfxVolume: number; zoom: number; shiftDrop: boolean; autoMusic: boolean; dayNight?: boolean; weather?: boolean;
  /** Graphics quality: auto (drops to low if frames run slow), high or low. */
  graphics?: "auto" | "high" | "low" };
export type PanelProps = {
  game: Game; tab: Tab; setTab: (tab: Tab) => void; selection: Selection; setSelection: (selection: Selection) => void;
  openMenu: (x: number, y: number, entries: MenuEntry[]) => void; refresh: () => void; roster: readonly OwnedFriend[]; rosterState: "waiting" | "ready" | "none";
  friendSprites: ReadonlyMap<number, GenerationSprites>; loadFriend: (id: number) => void; settings: Settings; setSettings: (settings: Settings) => void;
  friend: GenerationSprites | null; trackName: string; trackId: string; playTrack: (id: string) => void; openCard: () => void; openHelp: () => void; paused: boolean; saved: string; relicCounts: readonly number[]; openCaskets: () => void;
  /** Playing together: who's around, and the friends list. */
  /** The skill guide (a skill) or the recipe book (null). */
  openGuide?: (skill: Skill | null) => void;
  /** Save codes: copy or download yours, or restore one (resolves to an error message, or null). */
  onLogout?: () => void;
  onExportSave?: (action: "copy" | "download") => void; onRestoreSave?: (code: string) => Promise<string | null>; backupStatus?: string;
  net?: NetState; onSocial?: (op: "add" | "remove" | "ignore" | "unignore", id: number) => void; onWhisper?: (id: number) => void; onOnline?: (on: boolean) => void;
};
export function SidePanel(props: PanelProps) {
  const { tab, setTab } = props;
  return (
    <aside className="realm-side" aria-label="Game panels">
      <div className="realm-tabs" role="tablist">
        {TABS.map(entry => (
          <button key={entry.id} type="button" role="tab" aria-selected={tab === entry.id} title={`${entry.label} (${entry.key})`} aria-label={entry.label} onClick={() => setTab(entry.id)}
            {...rightClick(props.openMenu, () => [{ verb: "Open", noun: entry.label, run: () => setTab(entry.id) }])}><PixelIcon art={tabArt(entry.id as TabIcon)} size={24} /></button>
        ))}
      </div>
      <div className="realm-tab-body" role="tabpanel" aria-label={TABS.find(entry => entry.id === tab)?.label}>
        {tab === "combat" && <CombatTab {...props} />}
        {tab === "skills" && <SkillsTab {...props} />}
        {tab === "quests" && <QuestsTab {...props} />}
        {tab === "inventory" && <InventoryTab {...props} />}
        {tab === "equipment" && <EquipmentTab {...props} />}
        {tab === "prayer" && <PrayerTab {...props} />}
        {tab === "magic" && <MagicTab {...props} />}
        {tab === "friends" && <FriendsTab {...props} />}
        {tab === "settings" && <SettingsTab {...props} />}
        {tab === "emotes" && <EmotesTab {...props} />}
      </div>
    </aside>
  );
}
function CombatTab({ game, refresh, openMenu }: PanelProps) {
  const player = game.player, held = weapon(player), bow = !!held?.equip?.bow;
  // With a bow the same four buttons are the archer's styles (Longrange reaches two tiles further).
  const styles = bow
    ? [["accurate", "Accurate", "Ranged XP"], ["aggressive", "Rapid", "Ranged XP, faster"], ["defensive", "Longrange", "Ranged + Defence XP"]] as const
    : [["accurate", "Accurate", "Attack XP"], ["aggressive", "Aggressive", "Strength XP"], ["defensive", "Defensive", "Defence XP"], ["controlled", "Controlled", "Shared XP"]] as const;
  const arrow = bestArrow(game);
  return (
    <div className="realm-combat">
      <h3>{held?.name ?? "Unarmed"}</h3>
      <p className="realm-muted">Combat level: <b>{combatLevel(player)}</b> · Max hit: <b>{bow ? rangedMaxHit(game) : playerMaxHit(game)}</b>{bow && <> · Range: <b>{bowRange(game)}</b></>}</p>
      {bow && <p className="realm-note">{arrow ? `Firing ${item(arrow.id).name.toLowerCase()} (${count(player, arrow.id)} left).` : `No ${held?.equip?.bow?.bolts ? "bolts" : "arrows"} you can use in your pack!`}</p>}
      <div className="realm-styles">
        {styles.map(([id, name, xp]) => <button key={id} type="button" aria-pressed={player.style === id} onClick={() => { setStyle(game, id); refresh(); }}
          {...rightClick(openMenu, () => [{ verb: "Select", noun: name, run: () => { setStyle(game, id); refresh(); } }])}><b>{name}</b><small>{xp}</small></button>)}
      </div>
      {player.autocast && <p className="realm-note">Autocasting {SPELLS.find(spell => spell.id === player.autocast)?.name}. Choose it again in Magic to stop.</p>}
      <label className="realm-check"><input type="checkbox" checked={game.autoRetaliate} onChange={event => { game.autoRetaliate = event.target.checked; refresh(); }} /> Auto retaliate</label>
    </div>
  );
}
function SkillsTab({ game, openMenu, openGuide }: PanelProps) {
  const player = game.player, [focus, setFocus] = useState<Skill | null>(null);
  const info = (skill: Skill) => {
    const xp = Math.floor(player.xp[skill]), level = levelForXp(xp), next = level < 99 ? XP_TABLE[level + 1] : null;
    return `${SKILL_NAMES[skill]} XP: ${xp.toLocaleString()}${next ? ` · Next level at: ${next.toLocaleString()} · Remaining: ${(next - xp).toLocaleString()}` : ""}`;
  };
  return (
    <div>
      <div className="realm-skills">
        {SKILLS.map(skill => {
          const level = levelForXp(player.xp[skill]), current = skill === "hitpoints" ? player.hp : skill === "prayer" ? Math.ceil(player.prayer) : level;
          const next = level < 99 ? XP_TABLE[level + 1] : XP_TABLE[99], base = XP_TABLE[level], progress = level >= 99 ? 1 : (player.xp[skill] - base) / Math.max(1, next - base);
          return (
            <button key={skill} type="button" className="realm-skill" title={info(skill)} aria-label={info(skill)} onClick={() => openGuide?.(skill)} onMouseEnter={() => setFocus(skill)}
              {...rightClick(openMenu, () => [{ verb: "Guide", noun: SKILL_NAMES[skill], run: () => openGuide?.(skill) }, { verb: "Check", noun: SKILL_NAMES[skill], run: () => message(game, info(skill)) }])}>
              <PixelIcon art={skillArt(skill)} size={27} /><span>{current}<small>/{level}</small></span>
              <em style={{ width: `${Math.round(progress * 100)}%` }} />
            </button>
          );
        })}
        <div className="realm-skill total"><span>Total level:<br /><b>{totalLevel(player)}</b></span></div>
      </div>
      <p className="realm-skill-info">{focus ? info(focus) : `Total XP: ${totalXp(player).toLocaleString()} · XP rate ×${xpMultiplier(player).toFixed(2)}`}</p>
      <button type="button" className="realm-wide" onClick={() => openGuide?.(null)}>Recipe book</button>
      <p className="realm-note">Click a skill for its guide: everything it unlocks, and when.</p>
    </div>
  );
}
function QuestsTab({ game, openMenu }: PanelProps) {
  const [open, setOpen] = useState<string | null>(null), quest = QUESTS.find(entry => entry.id === open);
  if (quest) return (
    <div className="realm-journal">
      <button type="button" className="realm-back" onClick={() => setOpen(null)}>‹ Quest list</button>
      <h3>{quest.name}</h3>
      <p className="realm-muted">{quest.difficulty} · {quest.points} quest point{quest.points > 1 ? "s" : ""}{quest.requirements.length ? ` · ${quest.requirements.join(", ")}` : ""}</p>
      {quest.journal(game).map((line, index) => <p key={index}>{line}</p>)}
    </div>
  );
  return (
    <div className="realm-quests">
      <p className="realm-muted">Quest points: <b>{questPoints(game)}</b> / {MAX_QUEST_POINTS}</p>
      <ul>
        {QUESTS.map(entry => {
          const stage = game.player.quests[entry.id] ?? 0, state = stage >= finalStage(entry.id) ? "done" : stage > 0 ? "started" : "new";
          return <li key={entry.id}><button type="button" className={`quest-${state}`} onClick={() => setOpen(entry.id)}
            {...rightClick(openMenu, () => [{ verb: "Read-journal", noun: entry.name, run: () => setOpen(entry.id) }, { verb: "Start-at", noun: entry.name, run: () => message(game, entry.start) }])}>{entry.name}</button></li>;
        })}
      </ul>
      <p className="realm-note">Red: not started · Yellow: in progress · Green: complete</p>
    </div>
  );
}
function InventoryTab({ game, selection, setSelection, openMenu, refresh, settings, paused }: PanelProps) {
  const player = game.player, drag = useItemDrag<number>((from, target) => { if (target.startsWith("inv:")) { swapSlots(game, from, Number(target.slice(4))); refresh(); } });
  const click = (index: number, shift: boolean) => {
    if (paused) return;
    const slot = player.inventory[index];
    if (selection?.kind === "spell") {
      const spell = SPELLS.find(entry => entry.id === selection.spell);
      if (spell?.target === "item" && slot) { castOnItem(game, spell.id, index); refresh(); return; }
      setSelection(null); refresh(); return;
    }
    if (selection?.kind === "item") {
      if (selection.slot !== index && slot) useItemOnItem(game, selection.slot, index);
      setSelection(null); refresh(); return;
    }
    if (!slot) return;
    const options = itemOptions(game, index), first = settings.shiftDrop && shift ? options.find(option => option.verb === "Drop")! : options[0];
    const result = first.run(game);
    if (result) setSelection(result);
    refresh();
  };
  const context = (target: Element, clientX: number, clientY: number, index: number) => {
    const slot = player.inventory[index];
    if (!slot || paused) return;
    const [x, y] = stagePoint(target, clientX, clientY);
    openMenu(x, y, itemOptions(game, index).map(option => ({
      verb: option.verb, noun: item(slot.id).name, tone: "item", run: () => { const result = option.run(game); if (result) setSelection(result); refresh(); },
    })));
  };
  return (
    <div className="realm-inventory pack" onContextMenu={event => event.preventDefault()}>
      {player.inventory.map((slot, index) => (
        <button key={index} type="button" className="realm-slot" data-selected={selection?.kind === "item" && selection.slot === index}
          aria-label={slot ? `${item(slot.id).name}${slot.n > 1 ? ` × ${slot.n}` : ""}` : `Empty slot ${index + 1}`}
          data-drop={`inv:${index}`} data-over={drag.over === `inv:${index}` || undefined} {...drag.grab(index, slot?.id)}
          onClick={event => click(index, event.shiftKey)} onContextMenu={event => { event.preventDefault(); context(event.currentTarget, event.clientX, event.clientY, index); }}
          onTouchStart={event => { const touch = event.touches[0], target = event.currentTarget; longPress(() => context(target, touch.clientX, touch.clientY, index)); }} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}>
          {slot && <ItemIcon slot={slot} size={40} />}
        </button>
      ))}
      {drag.layer}
    </div>
  );
}
/**
 * Drag items around with the mouse (inventory and bank), built on pointer events rather than the browser's own drag and
 * drop, which in Chrome can get stuck (and swallow every click after) when the dragged slot re-renders mid-drag. Slots
 * spread `grab(key, itemId)` and mark where they accept drops with `data-drop`; `onDrop(from, dropKey)` runs on release.
 * A short press is still an ordinary click; after a real drag, the click that follows is swallowed.
 */
export function useItemDrag<T>(onDrop: (from: T, target: string) => void) {
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number; over: string | null } | null>(null);
  const press = useRef<{ from: T; id: string; x: number; y: number; moved: boolean; pointer: number; stage: Element } | null>(null), swallow = useRef(false), drop = useRef(onDrop);
  drop.current = onDrop;
  useEffect(() => {
    const targetAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-drop]")?.dataset.drop ?? null;
    const move = (event: PointerEvent) => {
      const held = press.current;
      if (!held || event.pointerId !== held.pointer) return;
      if (!held.moved && Math.hypot(event.clientX - held.x, event.clientY - held.y) < 6) return;
      held.moved = true;
      const [x, y] = stagePoint(held.stage, event.clientX, event.clientY);
      setGhost({ id: held.id, x, y, over: targetAt(event.clientX, event.clientY) });
    };
    const end = (event: PointerEvent) => {
      const held = press.current;
      if (!held || event.pointerId !== held.pointer) return;
      press.current = null;
      if (!held.moved) return;
      setGhost(null); swallow.current = true; setTimeout(() => { swallow.current = false; }, 0);
      const target = event.type === "pointerup" ? targetAt(event.clientX, event.clientY) : null;
      if (target) drop.current(held.from, target);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
  }, []);
  const grab = (from: T, id: string | null | undefined) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (!id || event.button !== 0 || event.pointerType === "touch") return;
      press.current = { from, id, x: event.clientX, y: event.clientY, moved: false, pointer: event.pointerId, stage: event.currentTarget };
    },
    onClickCapture: (event: React.MouseEvent) => { if (swallow.current) { event.stopPropagation(); event.preventDefault(); } },
    onDragStart: (event: React.DragEvent) => event.preventDefault(),
  });
  const layer = ghost ? <img className="realm-drag-ghost pixel" src={itemIconUrl(ghost.id)} alt="" width={40} height={40} style={{ left: ghost.x - 20, top: ghost.y - 20 }} /> : null;
  return { grab, layer, over: ghost?.over ?? null, dragging: !!ghost };
}
/** Convert a client point to stage (logical) coordinates; the stage may be scaled to fit the frame. */
export function stagePoint(target: Element, clientX: number, clientY: number) {
  const stage = target.closest(".realm-stage") as HTMLElement, rect = stage.getBoundingClientRect(), scale = rect.width / stage.offsetWidth;
  return [(clientX - rect.left) / scale, (clientY - rect.top) / scale] as const;
}
let pressTimer: ReturnType<typeof setTimeout> | null = null;
/** Touch: a long press opens the right-click menu. */
export function longPress(action: () => void) { cancelLongPress(); pressTimer = setTimeout(() => { pressTimer = null; action(); }, 450); }
export function cancelLongPress() { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; }
const SLOT_NAMES: Record<EquipSlot, string> = { head: "Head", cape: "Cape", neck: "Neck", weapon: "Weapon", body: "Body", shield: "Shield", legs: "Legs", hands: "Hands", feet: "Feet" };
function EquipmentTab({ game, refresh, openCard, openMenu }: PanelProps) {
  const player = game.player, total = bonuses(player);
  const layout: (EquipSlot | null)[] = [null, "head", null, "cape", "neck", null, "weapon", "body", "shield", null, "legs", null, "hands", "feet", null];
  return (
    <div className="realm-equipment">
      <div className="realm-equip-grid">
        {layout.map((slot, index) => slot ? (
          <button key={index} type="button" className="realm-slot" aria-label={player.equipment[slot] ? `Remove ${item(player.equipment[slot]!).name}` : `${SLOT_NAMES[slot]}: empty`}
            title={player.equipment[slot] ? `Remove ${item(player.equipment[slot]!).name}` : SLOT_NAMES[slot]} onClick={() => { unequip(game, slot); refresh(); }}
            {...rightClick(openMenu, () => { const id = player.equipment[slot]; return id ? [{ verb: "Remove", noun: item(id).name, tone: "item", run: () => { unequip(game, slot); refresh(); } },
              ...(id === SATCHEL ? [{ verb: "Check", noun: item(id).name, tone: "item" as const, run: () => { satchelCheck(game); refresh(); } }, { verb: "Fill", noun: item(id).name, tone: "item" as const, run: () => { satchelFill(game); refresh(); } },
                { verb: "Empty", noun: item(id).name, tone: "item" as const, run: () => { satchelEmpty(game); refresh(); } }] : []), examine(game, id, refresh)] : []; })}>
            {player.equipment[slot] ? <ItemIcon slot={{ id: player.equipment[slot]!, n: 1 }} /> : <span className="realm-slot-label">{SLOT_NAMES[slot]}</span>}
          </button>
        ) : <span key={index} />)}
      </div>
      <dl className="realm-bonuses">
        <div><dt>Attack</dt><dd>{signed(total.attack)}</dd></div><div><dt>Strength</dt><dd>{signed(total.strength)}</dd></div>
        <div><dt>Defence</dt><dd>{signed(total.defence)}</dd></div><div><dt>Ranged</dt><dd>{signed(total.ranged)}</dd></div>
        <div><dt>Magic</dt><dd>{signed(total.magic)}</dd></div><div><dt>Prayer</dt><dd>{signed(total.prayer)}</dd></div>
      </dl>
      <button type="button" className="realm-wide" onClick={openCard}>Adventurer card · Share on X</button>
    </div>
  );
}
const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));
function PrayerTab({ game, refresh, openMenu }: PanelProps) {
  const player = game.player, level = levelForXp(player.xp.prayer), [hover, setHover] = useState<string | null>(null);
  return (
    <div>
      <p className="realm-muted">Prayer points: <b>{Math.ceil(player.prayer)}</b> / {maxPrayer(player)} · Bonus {signed(bonuses(player).prayer)}</p>
      <div className="realm-icon-grid prayers">
        {PRAYERS.map(prayer => (
          <button key={prayer.id} type="button" aria-pressed={player.prayers.includes(prayer.id)} disabled={level < prayer.level} aria-label={`${prayer.name} (level ${prayer.level}): ${prayer.description}`}
            onMouseEnter={() => setHover(prayer.id)} onFocus={() => setHover(prayer.id)} onClick={() => { togglePrayer(game, prayer.id); refresh(); }}
            {...rightClick(openMenu, () => [{ verb: player.prayers.includes(prayer.id) ? "Deactivate" : "Activate", noun: prayer.name, run: () => { togglePrayer(game, prayer.id); refresh(); } }, { verb: "Examine", noun: prayer.name, run: () => { message(game, `${prayer.name}: ${prayer.description} (level ${prayer.level}).`); refresh(); } }])}>
            <PixelIcon art={prayerArt(prayer.id)} size={36} />
          </button>
        ))}
      </div>
      <InfoCard>{(() => { const prayer = PRAYERS.find(entry => entry.id === hover); return prayer ? <><b>{prayer.name}</b> <small>Level {prayer.level}</small><p>{prayer.description}. Drains {Math.round(prayer.drain * 100) / 100} points a tick.</p></> : <p>Recharge at any altar. Bury bones to train Prayer.</p>; })()}</InfoCard>
    </div>
  );
}
const TARGET_HINT: Record<string, string> = { monster: "Cast on a monster", item: "Cast on an item in your pack", ground: "Cast on an item on the ground", self: "Casts straight away" };
function MagicTab({ game, refresh, setSelection, selection, openMenu }: PanelProps) {
  const player = game.player, level = levelForXp(player.xp.magic), staff = isStaffEquipped(player), [hover, setHover] = useState<string | null>(null);
  const shown = SPELLS.find(spell => spell.id === (hover ?? (selection?.kind === "spell" ? selection.spell : player.autocast)));
  return (
    <div>
      <div className="realm-icon-grid spells">
        {SPELLS.map(spell => {
          const usable = !canCast(game, spell) || spell.id === "home", armed = (selection?.kind === "spell" && selection.spell === spell.id) || player.autocast === spell.id;
          return (
            <button key={spell.id} type="button" disabled={level < spell.level} data-usable={usable} aria-pressed={armed} aria-label={`${spell.name}, level ${spell.level}. ${spell.description}`}
              onMouseEnter={() => setHover(spell.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(spell.id)}
              onClick={() => { const next = castSpell(game, spell.id); setSelection(next); refresh(); }}
              {...rightClick(openMenu, () => [
                { verb: "Cast", noun: spell.name, tone: "level", run: () => { const next = castSpell(game, spell.id); setSelection(next); refresh(); } },
                ...(spell.maxHit && staff ? [{ verb: player.autocast === spell.id ? "Stop-autocast" : "Autocast", noun: spell.name, tone: "level", run: () => { castSpell(game, spell.id); refresh(); } }] : []),
                { verb: "Examine", noun: spell.name, run: () => { message(game, `${spell.name} (level ${spell.level}): ${spell.description}`); refresh(); } },
              ])}>
              <PixelIcon art={spellArt(spell.id, spell.element, spell.kind)} size={28} />
            </button>
          );
        })}
      </div>
      <InfoCard>
        {shown ? <>
          <b>{shown.name}</b> <small>Level {shown.level}{shown.maxHit ? ` · max hit ${shown.maxHit}` : ""}</small>
          <p>{shown.description} <em>{TARGET_HINT[shown.target]}{shown.maxHit && staff ? " (or autocast with your staff)" : ""}.</em></p>
          <div className="realm-sigils">{Object.entries(shown.sigils).map(([sigil, n]) => { const have = count(player, sigil) + (sigil === "breeze_sigil" && player.equipment.weapon === "breeze_staff" ? 999 : 0);
            return <span key={sigil} data-short={have < n}><ItemIcon slot={{ id: sigil, n: 1 }} size={26} bare />{n}<small>/{have > 998 ? "∞" : have}</small></span>; })}
            {!Object.keys(shown.sigils).length && <span>Free</span>}</div>
        </> : <p>Magic level <b>{level}</b>. Hover a spell for details. Darts, lances and bursts, curses, Gilded Touch, Forgeheart, Far Reach, Bonebloom and six ways home.</p>}
      </InfoCard>
    </div>
  );
}
function EmotesTab({ game, refresh, openMenu }: PanelProps) {
  const player = game.player, [hover, setHover] = useState<string | null>(null), shown = EMOTES.find(entry => entry.id === hover);
  return (
    <div>
      <div className="realm-icon-grid emotes">
        {EMOTES.map(emote => {
          const locked = emoteProblem(game, emote.id);
          return <button key={emote.id} type="button" data-usable={!locked} aria-pressed={player.emote?.id === emote.id} aria-label={`${emote.name}${locked ? ` (${locked})` : ""}`}
            onMouseEnter={() => setHover(emote.id)} onFocus={() => setHover(emote.id)} onClick={() => { performEmote(game, emote.id); refresh(); }}
            {...rightClick(openMenu, () => [{ verb: "Perform", noun: emote.name, run: () => { performEmote(game, emote.id); refresh(); } }])}>
            <PixelIcon art={emoteArt(emote.id)} size={30} /><small>{emote.name}</small>
          </button>;
        })}
      </div>
      <InfoCard>{shown ? <><b>{shown.name}</b>{"needs" in shown && <p>Needs {shown.needs}.</p>}</> : <p>Other players see your emotes too. Walking ends one.</p>}</InfoCard>
    </div>
  );
}
function InfoCard({ children }: { children: ReactNode }) { return <div className="realm-info" aria-live="polite">{children}</div>; }
function FriendsTab({ game, refresh, roster, rosterState, friendSprites, loadFriend, relicCounts, openCaskets, friend, openMenu, net, onSocial, onWhisper, onOnline }: PanelProps) {
  const player = game.player, perk = FAMILY_PERKS[player.familyId], [adding, setAdding] = useState(""), [referral, setReferral] = useState(""), [referralNote, setReferralNote] = useState("");
  useEffect(() => { for (const friend of roster.slice(0, 24)) loadFriend(friend.id); }, [roster, loadFriend]);
  const online = (id: number) => net?.peers.find(peer => peer.id === id) ?? null;
  return (
    <div className="realm-friends">
      <h3>Referrals</h3>
      <p className="realm-muted">Your code: <b className="realm-code">RF-{player.friendId}</b>. A friend who enters it and you each get <b>250 coins</b>, a <b>Friendship cape</b> (with its own emote) and <b>+15% XP</b> for an hour of play.</p>
      {player.boostTicks > 0 && <p className="realm-note">Referral boost: +15% XP for {Math.ceil(player.boostTicks / 100)} more minute{player.boostTicks > 100 ? "s" : ""} of play.</p>}
      {player.referrals.length > 0 && <p className="realm-note">Friends who joined with your code: {player.referrals.map(id => `#${id}`).join(", ")}</p>}
      {player.referredBy === null ? <label className="realm-add-friend">Friend's code <input value={referral} onChange={event => { setReferral(event.target.value.slice(0, 24)); setReferralNote(""); }} placeholder="RF-1234" aria-label="A friend's referral code"
        onKeyDown={event => { if (event.key === "Enter" && referral.trim()) { event.preventDefault(); event.stopPropagation(); setReferralNote(applyReferral(game, referral) ?? "Welcome aboard! Check your pack."); setReferral(""); refresh(); } }} /></label>
        : <p className="realm-muted">You joined with Friend #{player.referredBy}'s code.</p>}
      {referralNote && <p className="realm-note" role="status">{referralNote}</p>}
      <h3>Friends list <small>{net?.status === "online" ? `· ${net.players} in the Realm` : net?.status === "connecting" ? "· connecting…" : "· offline"}</small></h3>
      {net?.status === "offline" ? <p className="realm-muted">You're playing offline. <button type="button" className="realm-link" onClick={() => onOnline?.(true)}>Go online</button> to see and meet other players.</p> : <>
        <ul className="realm-social">
          {(net?.friends ?? []).map(id => {
            const here = online(id);
            return <li key={id} data-online={!!here} {...rightClick(openMenu, () => [
              ...(here ? [{ verb: "Message", noun: `Friend #${id}`, run: () => onWhisper?.(id) }] : []),
              { verb: "Remove-friend", noun: `Friend #${id}`, run: () => onSocial?.("remove", id) }])}>
              <i aria-hidden="true" /><b>#{id}</b><small>{here ? `${here.region || "Online"} · level-${here.combat}` : "Offline"}</small>
              {here && <button type="button" onClick={() => onWhisper?.(id)} aria-label={`Message Friend #${id}`}>✉</button>}
              <button type="button" onClick={() => onSocial?.("remove", id)} aria-label={`Remove Friend #${id}`}>✕</button>
            </li>;
          })}
          {!net?.friends.length && <li className="realm-muted">Right-click a player and choose Add-friend, or add a Friend # below.</li>}
        </ul>
        <label className="realm-add-friend">Add Friend #<input inputMode="numeric" value={adding} onChange={event => setAdding(event.target.value.replace(/\D/g, "").slice(0, 12))} aria-label="Friend number to add"
          onKeyDown={event => { if (event.key === "Enter" && adding) { event.preventDefault(); event.stopPropagation(); onSocial?.("add", Number(adding)); setAdding(""); } }} /></label>
        {!!net?.ignored.length && <p className="realm-muted">Ignored: {net.ignored.map(id => <button key={id} type="button" className="realm-link" onClick={() => onSocial?.("unignore", id)} title="Stop ignoring">#{id}</button>)}</p>}
        <p className="realm-note">Friends near you: +5% XP. Chat with <b>@1234 message</b> to whisper.</p>
      </>}
      <p className="realm-perk"><b>{FAMILY_NAMES[player.familyId]}: {perk.title}.</b> {perk.text}</p>
      <h3>Followers</h3>
      {rosterState === "waiting" && <p className="realm-muted">Looking for your other Friends…</p>}
      {rosterState === "none" && <p className="realm-muted">Other Friends you own can follow you here. Each adds XP: Gen 1 +5% … Gen 5+ +1%.</p>}
      <div className="realm-followers">
        {roster.map(friend => (
          <button key={friend.id} type="button" aria-pressed={player.follower === friend.id} title={`Friend #${friend.id}${friend.generation ? ` · Gen ${friend.generation}` : ""}`}
            onClick={() => { setFollower(game, player.follower === friend.id ? null : friend); refresh(); }}
            {...rightClick(openMenu, () => [player.follower === friend.id ? { verb: "Dismiss", noun: `Friend #${friend.id}`, tone: "npc", run: () => { setFollower(game, null); refresh(); } } : { verb: "Follow-me", noun: `Friend #${friend.id}`, tone: "npc", run: () => { setFollower(game, friend); refresh(); } }])}>
            <FriendPortrait sprites={friendSprites.get(friend.id) ?? null} family={friend.id % 9} seed={friend.id} size={36} />
            <small>#{friend.id}{friend.generation ? ` G${friend.generation}` : ""}</small>
          </button>
        ))}
      </div>
      <h3>Pets <small>({player.pets.length}/{PETS.length})</small></h3>
      <div className="realm-pets">
        {PETS.map(pet => { const owned = player.pets.includes(pet.id), out = player.petOut === pet.id;
          return <button key={pet.id} type="button" disabled={!owned} aria-pressed={out} title={owned ? `${pet.name}: ${pet.text} Click to ${out ? "send home" : "call"}.` : `Undiscovered: found while ${pet.from === "Dragons" || pet.from.startsWith("The ") ? `fighting ${pet.from === "Dragons" ? "dragons" : pet.from}` : `training ${pet.from}`}`}
            aria-label={owned ? `${pet.name}${out ? " (following you)" : ""}` : `Undiscovered pet (${pet.from})`} onClick={() => { setPet(game, out ? null : pet.id); refresh(); }}
            {...rightClick(openMenu, () => owned ? [out ? { verb: "Send-home", noun: pet.name, tone: "npc", run: () => { setPet(game, null); refresh(); } } : { verb: "Call", noun: pet.name, tone: "npc", run: () => { setPet(game, pet.id); refresh(); } },
              { verb: "Examine", noun: pet.name, run: () => { message(game, pet.text); refresh(); } }] : [{ verb: "Examine", noun: "Undiscovered pet", run: () => { message(game, `A pet found by chance: ${pet.from}.`); refresh(); } }])}>
            {owned ? <PixelIcon art={petArt(pet.id, 0)} size={34} /> : <span className="realm-mystery">?</span>}<small>{owned ? pet.name : pet.from}</small>
          </button>; })}
      </div>
      <h3>Hiscores <small>(you and the players you've met)</small></h3>
      {(() => { const rows = hiscores(game), me = rows.find(row => row.you)!, shown = rows.slice(0, 10), friends = new Set(net?.friends ?? []);
        return <><table className="realm-hiscores"><thead><tr><th>#</th><th>Friend</th><th>Total</th><th>Combat</th></tr></thead><tbody>
          {(shown.includes(me) ? shown : [...shown, me]).map(row => <tr key={row.id} className={row.you ? "you" : friends.has(row.id) ? "friend" : ""}><td>{row.rank}</td><td>{row.you ? "You" : `#${row.id}`}{friends.has(row.id) ? " ♥" : ""}</td><td>{row.total}</td><td>{row.combat}</td></tr>)}
        </tbody></table>{rows.length === 1 && <p className="realm-muted">Play online to meet other players: they'll show up here.</p>}</>; })()}
      <h3>Wardrobe <small>({player.wardrobe.length}/{WARDROBE.length})</small></h3>
      <div className="realm-wardrobe">
        {WARDROBE.map(piece => {
          const owned = player.wardrobe.includes(piece.id);
          return <button key={piece.id} type="button" disabled={!owned} aria-pressed={player.worn.includes(piece.id)} title={owned ? `${piece.name}: click to ${player.worn.includes(piece.id) ? "take off" : "wear"}` : `${piece.name}: from Rare Caskets`}
            aria-label={owned ? `${piece.name}${player.worn.includes(piece.id) ? " (worn)" : ""}` : "Undiscovered wardrobe piece"}
            onClick={() => { toggleWorn(game, piece.id); refresh(); }}
            {...rightClick(openMenu, () => owned ? [{ verb: player.worn.includes(piece.id) ? "Take-off" : "Wear", noun: piece.name, tone: "item", run: () => { toggleWorn(game, piece.id); refresh(); } }] : [])}>
            {owned ? <FriendPortrait sprites={friend} family={player.familyId} seed={1} size={40} worn={[piece.id]} /> : <span className="realm-mystery">?</span>}
            <small>{owned ? piece.name : "???"}</small>
          </button>;
        })}
      </div>
      <h3>Rare Relics</h3>
      <ul className="realm-relics">{RELICS.map((relic, index) => <li key={relic.name}><b>{relic.name} × {relicCounts[index] ?? 0}</b><small>{relic.text}</small></li>)}</ul>
      <button type="button" className="realm-wide" onClick={openCaskets}>Rare Caskets (simulated RF)</button>
    </div>
  );
}
/** A slider in the Realm's style: a chunky groove filled in gold up to the value, a pixel knob, and the value shown. */
function Slider({ label, min, max, value, unit = "", onChange }: { label: string; min: number; max: number; value: number; unit?: string; onChange: (value: number) => void }) {
  const fill = `${((value - min) / Math.max(1, max - min)) * 100}%`;
  return (
    <label className="realm-range"><span>{label}<b>{value}{unit}</b></span>
      <input className="realm-slider" type="range" min={min} max={max} value={value} style={{ "--fill": fill } as React.CSSProperties} onChange={event => onChange(Number(event.target.value))} />
    </label>
  );
}
function SettingsTab({ game, settings, setSettings, trackName, trackId, playTrack, openHelp, saved, refresh, openMenu, net, onOnline, onExportSave, onRestoreSave, backupStatus, onLogout }: PanelProps) {
  const set = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });
  const [code, setCode] = useState(""), [confirming, setConfirming] = useState(false), [restoreNote, setRestoreNote] = useState("");
  const unlocked = game.player.music;
  return (
    <div className="realm-settings">
      <h3>Music <small>({unlocked.filter(id => TRACKS.some(track => track.id === id)).length}/{TRACKS.length} unlocked)</small></h3>
      <label className="realm-check"><input type="checkbox" checked={settings.autoMusic} onChange={event => set({ autoMusic: event.target.checked })} /> Auto: play each area's track</label>
      <ul className="realm-tracks" aria-label="Music tracks">
        {TRACKS.map(track => {
          const open = unlocked.includes(track.id);
          return <li key={track.id}><button type="button" disabled={!open} aria-pressed={trackId === track.id} className={open ? "unlocked" : "locked"} onClick={() => playTrack(track.id)}
            {...rightClick(openMenu, () => open ? [{ verb: "Play", noun: track.name, run: () => playTrack(track.id) }] : [])}>{open ? track.name : "???"}</button></li>;
        })}
      </ul>
      <label className="realm-check"><input type="checkbox" checked={settings.music} onChange={event => set({ music: event.target.checked })} /> Music <small>({trackName})</small></label>
      <Slider label="Music volume" min={0} max={100} value={Math.round(settings.musicVolume * 100)} unit="%" onChange={value => set({ musicVolume: value / 100 })} />
      <label className="realm-check"><input type="checkbox" checked={settings.sfx} onChange={event => set({ sfx: event.target.checked })} /> Sound effects</label>
      <Slider label="Effects volume" min={0} max={100} value={Math.round(settings.sfxVolume * 100)} unit="%" onChange={value => set({ sfxVolume: value / 100 })} />
      <Slider label="Zoom" min={55} max={300} value={Math.round(settings.zoom * 100)} unit="%" onChange={value => set({ zoom: value / 100 })} />
      <label className="realm-check"><input type="checkbox" checked={net?.status !== "offline"} onChange={event => onOnline?.(event.target.checked)} /> Online: see and meet other players</label>
      <label className="realm-check"><input type="checkbox" checked={settings.weather !== false} onChange={event => set({ weather: event.target.checked })} /> Weather (rain, storms, fog)</label>
      <div className="realm-graphics" role="radiogroup" aria-label="Graphics">
        <span>Graphics:</span>{(["auto", "high", "low"] as const).map(level => <button key={level} type="button" role="radio" aria-checked={(settings.graphics ?? "auto") === level} onClick={() => set({ graphics: level })}
          title={level === "auto" ? "High, dropping to Low by itself if frames run slow" : level === "high" ? "Pixel textures, ambient life, fog and footprints, sharp on high-DPI screens" : "Plain ground, no ambient life, lighter weather: smoothest on older devices"}>{level === "auto" ? "Auto" : level === "high" ? "High" : "Low"}</button>)}
      </div>
      <label className="realm-check"><input type="checkbox" checked={settings.dayNight !== false} onChange={event => set({ dayNight: event.target.checked })} /> Day and night</label>
      <label className="realm-check"><input type="checkbox" checked={settings.shiftDrop} onChange={event => set({ shiftDrop: event.target.checked })} /> Shift-click to drop</label>
      <label className="realm-check"><input type="checkbox" checked={game.player.run} onChange={() => { toggleRun(game); refresh(); }} /> Run</label>
      <p className="realm-note">{saved}</p>
      {onLogout && <button type="button" className="realm-primary realm-wide" onClick={onLogout}>⏻ Save and log out</button>}
      <h3>Back up your adventure</h3>
      <p className="realm-muted">Browser saves can be cleared. A save code holds your whole adventure: keep it anywhere, and paste it back on any browser.</p>
      <div className="realm-buttons"><button type="button" onClick={() => onExportSave?.("copy")}>Copy save code</button><button type="button" onClick={() => onExportSave?.("download")}>Download save file</button></div>
      {backupStatus && <p className="realm-note" role="status">{backupStatus}</p>}
      <label className="realm-restore">Restore from a code <input value={code} onChange={event => { setCode(event.target.value); setConfirming(false); setRestoreNote(""); }} placeholder="RFR1-…" aria-label="Save code to restore" /></label>
      {code.trim() && <button type="button" className={confirming ? "realm-primary" : undefined} onClick={() => {
        if (!confirming) { setConfirming(true); setRestoreNote("This replaces your current progress with the code's. Press again to restore."); return; }
        void onRestoreSave?.(code).then(error => { setConfirming(false); setRestoreNote(error ?? "Restored! Welcome back."); if (!error) setCode(""); refresh(); });
      }}>{confirming ? "Yes, restore it" : "Restore"}</button>}
      {restoreNote && <p className="realm-note" role="status">{restoreNote}</p>}
      <button type="button" className="realm-wide" onClick={openHelp}>Controls and tips</button>
    </div>
  );
}

// ---------- Chat, dialogue, level-ups, production ----------
export function ChatBox({ messages, onSend, prefill }: { messages: readonly Message[]; onSend: (text: string) => void; prefill?: { text: string; at: number } | null }) {
  const [filter, setFilter] = useState<"all" | "game" | "public" | "private">("all"), [draft, setDraft] = useState(""), list = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const social = (tone: string) => tone === "public" || tone === "private";
  const shown = messages.filter(entry => filter === "all" || (filter === "game" ? !social(entry.tone) : entry.tone === filter)).slice(-60);
  // "Message" on a player starts a private line to them.
  useEffect(() => { if (prefill) { setDraft(prefill.text); setTimeout(() => input.current?.focus(), 0); } }, [prefill]);
  useEffect(() => { const node = list.current; if (node) node.scrollTop = node.scrollHeight; }, [shown.length, filter]);
  return (
    <section className="realm-chat" aria-label="Chat">
      <div className="realm-chat-log" ref={list} role="log" aria-live="polite">
        {shown.map((entry, index) => <p key={`${entry.tick}-${index}`} className={`chat-${entry.tone}`}>{entry.text}</p>)}
      </div>
      {/* No <form>: the sandboxed game frame has no allow-forms, so a submit would be blocked. Enter sends. */}
      <div className="realm-chat-input">
        <label><span>You:</span><input ref={input} value={draft} maxLength={88} onChange={event => setDraft(event.target.value)} placeholder="Press Enter to chat" aria-label="Say something" data-chat="true"
          onKeyDown={event => {
            if (event.key !== "Enter") return;
            event.preventDefault(); event.stopPropagation();
            if (draft.trim()) onSend(draft.trim().slice(0, 88));
            setDraft(""); event.currentTarget.blur();
          }} /></label>
      </div>
      <div className="realm-chat-tabs" role="tablist">
        {(["all", "game", "public", "private"] as const).map(id => <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>{id === "all" ? "All" : id === "game" ? "Game" : id === "public" ? "Public" : "Private"}</button>)}
      </div>
    </section>
  );
}
export function DialogueBox({ game, sprites, canonical, refresh }: { game: Game; sprites: GenerationSprites | null; canonical: ReadonlyMap<number, GenerationSprites>; refresh: () => void }) {
  const dialogue = game.dialogue!;
  const options = dialogueAtOptions(dialogue) ? dialogue.options! : null, line = dialogue.lines[Math.min(dialogue.index, dialogue.lines.length - 1)];
  const npc = Object.values(NPCS).find(entry => entry.name === dialogue.npc);
  const portrait = line.who === "player" ? <FriendPortrait sprites={sprites} size={64} />
    : npc && "canonical" in npc.art ? <FriendPortrait sprites={canonical.get(npc.art.canonical) ?? null} size={64} />
    : npc && "family" in npc.art ? <FriendPortrait family={npc.art.family} seed={npc.art.seed} size={64} /> : null;
  return (
    <section className="realm-dialogue" aria-label={`Talking to ${dialogue.npc}`} aria-live="polite">
      {options ? (
        <div className="realm-options">
          <h3>Select an option</h3>
          {options.map((option, index) => <button key={index} type="button" onClick={() => { chooseOption(game, index); refresh(); }}><kbd>{index + 1}</kbd> {option.label}</button>)}
        </div>
      ) : (
        <button type="button" className={`realm-line who-${line.who}`} onClick={() => { continueDialogue(game); refresh(); }}>
          {line.who === "npc" && portrait}
          <span><b>{line.who === "player" ? "You" : dialogue.npc}</b>{line.text}<em>Click here to continue (Space)</em></span>
          {line.who === "player" && portrait}
        </button>
      )}
    </section>
  );
}
export function LevelUpBox({ skill, level, onClose }: { skill: Skill; level: number; onClose: () => void }) {
  return (
    <section className="realm-dialogue" aria-live="assertive">
      <button type="button" className="realm-line realm-levelup" onClick={onClose}>
        <PixelIcon art={skillArt(skill)} size={54} />
        <span><b>Congratulations, you just advanced a{/^[AEIOU]/.test(SKILL_NAMES[skill]) ? "n" : ""} {SKILL_NAMES[skill]} level.</b>Your {SKILL_NAMES[skill]} level is now {level}.<em>Click here to continue (Space)</em></span>
      </button>
    </section>
  );
}
export function ProductionBox({ game, refresh, openMenu }: { game: Game; refresh: () => void; openMenu?: OpenMenu }) {
  const menu = game.ui.production!, [amount, setAmount] = useState(28);
  const most = (recipe: Recipe) => Math.min(28, ...Object.entries(recipe.inputs).map(([id, n]) => Math.floor(count(game.player, id) / n)));
  return (
    <section className="realm-dialogue realm-make" aria-label={menu.title}>
      <div className="realm-make-head"><h3>{menu.title}</h3>
        <div className="realm-amounts">{[1, 5, 10, 28].map(n => <button key={n} type="button" aria-pressed={amount === n} onClick={() => setAmount(n)}>{n === 28 ? "All" : n}</button>)}
          <button type="button" onClick={() => { game.ui.production = null; refresh(); }} aria-label="Close">✕</button></div>
      </div>
      <div className="realm-make-list">
        {menu.recipes.map(recipe => {
          const problem = recipeProblem(game, recipe), output = Object.keys(recipe.outputs)[0];
          return (
            <button key={recipe.label} type="button" disabled={!!problem} title={problem ?? `${recipe.label}: level ${recipe.level}, ${Object.entries(recipe.inputs).map(([id, n]) => `${n} ${item(id).name.toLowerCase()}`).join(", ")}`}
              onClick={() => { startProduction(game, recipe, Math.min(amount, Math.max(1, most(recipe)))); refresh(); }}
              {...rightClick(openMenu, () => problem ? [] : [1, 5, 10, 28].map(n => ({ verb: `Make-${n === 28 ? "All" : n}`, noun: recipe.label, tone: "item", run: () => { startProduction(game, recipe, Math.min(n, Math.max(1, most(recipe)))); refresh(); } })))}>
              <ItemIcon slot={{ id: output, n: 1 }} size={32} /><small>{recipe.label}<br />Lv {recipe.level}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Modals ----------
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="realm-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`realm-modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="realm-modal-body">{children}</div>
      </section>
    </div>
  );
}
/** The bank tab last looked at, kept while the game is open. */
let lastBankTab = 0;
export function BankModal({ game, refresh, onClose, openMenu }: { game: Game; refresh: () => void; onClose: () => void; openMenu: PanelProps["openMenu"] }) {
  const player = game.player, [search, setSearch] = useState(""), [amount, setAmount] = useState<number>(1);
  const tabs = bankTabs(player), [tab, setTabState] = useState(() => Math.min(lastBankTab, tabs.length));
  // Drop on an item to move before it, on a tab to file it there, on + for a new tab.
  const drag = useItemDrag<string>((id, target) => {
    const moved = target.startsWith("bank:") ? bankMove(player, id, target.slice(5)) : target === "tab:new" ? bankMove(player, id, null, "new") : target.startsWith("tab:") ? bankMove(player, id, null, Number(target.slice(4))) : false;
    if (moved) refresh();
  });
  const setTab = (next: number) => { lastBankTab = next; setTabState(next); };
  const current = tabs.includes(tab) ? tab : 0;
  // Tab 0 shows everything (the main tab's items first, then each tab's); tabs 1+ show only their own.
  const shown = bankInOrder(player).filter(slot => (current === 0 || (slot.tab ?? 0) === current) && (!search || item(slot.id).name.toLowerCase().includes(search.toLowerCase())));
  const dropTarget = (key: string) => ({ "data-drop": key, "data-over": drag.over === key || undefined });
  const carriedBoxes = CONTAINERS.filter(box => box.carried(player));
  const fillBox = (id: string) => {
    const box = CONTAINERS.find(entry => entry.item === id)!, n = fillFromBank(player, id), what = item(box.holds).name.toLowerCase();
    message(game, n ? `You fill your ${item(id).name.toLowerCase()} with ${n} ${what} from the bank (${player[box.key]}/${box.size}).` : player[box.key] >= box.size ? `Your ${item(id).name.toLowerCase()} is already full.` : `You have no ${what} in the bank.`);
  };
  const move = (id: string, to: number | "new") => { if (bankMove(player, id, null, to)) refresh(); };
  const moveMenu = (id: string) => [
    ...((player.bank.find(slot => slot.id === id)?.tab ?? 0) ? [{ verb: "Move to", noun: "main tab", tone: "item" as const, run: () => move(id, 0) }] : []),
    ...tabs.filter(t => t !== (player.bank.find(slot => slot.id === id)?.tab ?? 0)).map(t => ({ verb: "Move to", noun: `tab ${t}`, tone: "item" as const, run: () => move(id, t) })),
    ...(tabs.length < BANK_TABS ? [{ verb: "Move to", noun: "a new tab", tone: "item" as const, run: () => move(id, "new") }] : []),
  ];
  let lastTab = -1;
  return (
    <Modal title="Bank of the Realm" onClose={onClose} wide>
      <div className="realm-bank-tabs" role="tablist" aria-label="Bank tabs">
        <button type="button" role="tab" aria-selected={current === 0} aria-label="All items" title="All items (drop here for the main tab)" onClick={() => setTab(0)} {...dropTarget("tab:0")}>∞</button>
        {tabs.map(t => { const first = player.bank.find(slot => (slot.tab ?? 0) === t)!; return (
          <button key={t} type="button" role="tab" aria-selected={current === t} aria-label={`Bank tab ${t}`} title={`Tab ${t} (drop items here)`} onClick={() => setTab(t)} {...dropTarget(`tab:${t}`)}>
            <img src={itemIconUrl(first.id)} alt="" width={26} height={26} draggable={false} className="pixel" />
          </button>
        ); })}
        {tabs.length < BANK_TABS && <button type="button" className="new" aria-label="New tab (drop an item here)" title="New tab: drag an item here" {...dropTarget("tab:new")}>+</button>}
      </div>
      <div className="realm-bank-bar">
        <input type="search" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search the bank" />
        <span>Withdraw/deposit:</span>{[1, 5, 10, Infinity].map(n => <button key={n} type="button" aria-pressed={amount === n} onClick={() => setAmount(n)}>{n === Infinity ? "All" : n}</button>)}
        <button type="button" onClick={() => { bankDepositAll(player, current); refresh(); }}>Deposit inventory</button>
        <button type="button" onClick={() => { bankDepositWorn(player, current); refresh(); }}>Deposit worn</button>
        {carriedBoxes.length > 0 && <button type="button" onClick={() => { for (const box of carriedBoxes) fillBox(box.item); refresh(); }}>Fill {carriedBoxes.length > 1 ? "boxes" : carriedBoxes[0].item === SATCHEL ? "satchel" : "box"}</button>}
      </div>
      <div className="realm-bank">
        <div className="realm-bank-grid" aria-label="Bank">
          {shown.map(slot => {
            const slotTab = slot.tab ?? 0, divider = current === 0 && !search && slotTab !== lastTab && slotTab > 0;
            lastTab = slotTab;
            return (
              <React.Fragment key={slot.id}>
                {divider && <span className="realm-bank-divider">Tab {slotTab}</span>}
                <button type="button" className="realm-slot" aria-label={`Withdraw ${item(slot.id).name} (${slot.n})`}
                  {...drag.grab(slot.id, slot.id)} {...dropTarget(`bank:${slot.id}`)}
                  onClick={() => { bankWithdraw(player, slot.id, amount); refresh(); }}
                  {...rightClick(openMenu, () => [...[1, 5, 10, Infinity].map(n => ({ verb: `Withdraw-${n === Infinity ? "All" : n}`, noun: item(slot.id).name, tone: "item", run: () => { bankWithdraw(player, slot.id, n); refresh(); } })), ...moveMenu(slot.id), examine(game, slot.id, refresh)])}>
                  <ItemIcon slot={slot} />
                </button>
              </React.Fragment>
            );
          })}
          {drag.layer}
          {!shown.length && <p className="realm-muted">{search ? "Nothing matches." : current ? "This tab is empty." : "Your bank is empty."}</p>}
        </div>
        <div className="realm-inventory small" aria-label="Inventory (click to deposit)">
          {player.inventory.map((slot, index) => (
            <button key={index} type="button" className="realm-slot" aria-label={slot ? `Deposit ${item(slot.id).name}` : `Empty slot ${index + 1}`} onClick={() => { if (slot) { bankDeposit(player, index, amount, current); refresh(); } }}
              {...rightClick(openMenu, () => slot ? [
                // A satchel or sigil stone box you carry fills straight from the bank (or tips its contents in).
                ...(CONTAINERS.some(box => box.item === slot.id) ? [
                  { verb: "Fill", noun: item(slot.id).name, tone: "item" as const, run: () => { fillBox(slot.id); refresh(); } },
                  { verb: "Empty-into-bank", noun: item(slot.id).name, tone: "item" as const, run: () => { const n = emptyToBank(player, slot.id); message(game, n ? `You empty ${n} ${item(CONTAINERS.find(box => box.item === slot.id)!.holds).name.toLowerCase()} into the bank.` : "It's empty."); refresh(); } },
                ] : []),
                ...[1, 5, 10, Infinity].map(n => ({ verb: `Deposit-${n === Infinity ? "All" : n}`, noun: item(slot.id).name, tone: "item", run: () => { bankDeposit(player, index, n, current); refresh(); } })), examine(game, slot.id, refresh)] : [])}>
              {slot && <ItemIcon slot={slot} size={38} />}
            </button>
          ))}
        </div>
      </div>
      <p className="realm-note">{player.bank.length} / 400 slots · Click to withdraw or deposit; right-click for amounts. Drag items to rearrange them, onto a tab to file them there, or onto + for a new tab.{current ? ` Deposits go into tab ${current}.` : ""}</p>
    </Modal>
  );
}
export function ShopModal({ game, shopId, refresh, onClose, openMenu }: { game: Game; shopId: string; refresh: () => void; onClose: () => void; openMenu?: OpenMenu }) {
  const shop = SHOPS[shopId], player = game.player, [amount, setAmount] = useState(1);
  return (
    <Modal title={shop.name} onClose={onClose} wide>
      <div className="realm-bank-bar"><span>Buy/sell:</span>{[1, 5, 10, 50].map(n => <button key={n} type="button" aria-pressed={amount === n} onClick={() => setAmount(n)}>{n}</button>)}
        <span className="realm-coins">Coins: <b>{count(player, "coins").toLocaleString()}</b></span></div>
      <div className="realm-bank">
        <div className="realm-bank-grid" aria-label="Shop stock">
          {[...shop.stock.map(id => ({ id, n: 0 })), ...(game.shopStock[shopId] ?? [])].map(({ id, n: have }) => { const locked = capeProblem(game, id); return (
            <button key={`${id}${have ? ":sold" : ""}`} type="button" className={`realm-slot shop${locked ? " locked" : ""}`} aria-label={`Buy ${item(id).name} for ${buyPrice(game, id)} coins${have ? ` (${have} in stock, sold by you)` : ""}${locked ? ` (${locked})` : ""}`}
              title={`${item(id).name}: ${buyPrice(game, id).toLocaleString()} coins${locked ? `. ${locked}` : ""}`} onClick={() => { buy(game, shopId, id, amount); refresh(); }}
              {...rightClick(openMenu, () => [{ verb: "Value", noun: item(id).name, tone: "item", run: () => { message(game, `${item(id).name}: currently costs ${buyPrice(game, id).toLocaleString()} coins.`); refresh(); } },
                ...[1, 5, 10, 50].map(n => ({ verb: `Buy-${n}`, noun: item(id).name, tone: "item", run: () => { buy(game, shopId, id, n); refresh(); } })), examine(game, id, refresh)])}>
              <ItemIcon slot={{ id, n: have || 1 }} size={40} /><small>{buyPrice(game, id) >= 10_000 ? `${Math.round(buyPrice(game, id) / 1000)}K` : buyPrice(game, id).toLocaleString()}</small>
            </button>
          ); })}
        </div>
        <div className="realm-inventory small" aria-label="Inventory (click to sell)">
          {player.inventory.map((slot, index) => (
            <button key={index} type="button" aria-label={slot ? (shopBuys(shopId, slot.id) ? `Sell ${item(slot.id).name} for ${sellPrice(slot.id, shopId)} coins` : `${item(slot.id).name}: this shop won't buy it`) : `Empty slot ${index + 1}`}
              title={slot ? (shopBuys(shopId, slot.id) ? `Sell for ${sellPrice(slot.id, shopId)} coins` : "Not wanted here") : undefined} className={`realm-slot${slot && !shopBuys(shopId, slot.id) ? " locked" : ""}`}
              onClick={() => { if (slot) { sell(game, shopId, index, amount); refresh(); } }}
              {...rightClick(openMenu, () => slot ? [{ verb: "Value", noun: item(slot.id).name, tone: "item", run: () => { message(game, shopBuys(shopId, slot.id) ? `${item(slot.id).name}: this shop will buy it for ${sellPrice(slot.id, shopId).toLocaleString()} coins.` : `This shop won't buy ${item(slot.id).name.toLowerCase()}.`); refresh(); } },
                ...(shopBuys(shopId, slot.id) ? [1, 5, 10, 50].map(n => ({ verb: `Sell-${n}`, noun: item(slot.id).name, tone: "item", run: () => { sell(game, shopId, index, n); refresh(); } })) : []), examine(game, slot.id, refresh)] : [])}>
              {slot && <ItemIcon slot={slot} size={38} />}
            </button>
          ))}
        </div>
      </div>
      <p className="realm-note">{shopId === "capes" ? "A mastery cape needs level 99 in its skill. Master two skills and every cape comes trimmed." : `Click the stock to buy; click your pack (right) to sell. ${shop.general ? "A general store buys almost anything." : shop.buys ? `Buys what it sells, and pays ${Math.round((shop.rate ?? 0.4) * 100)}% of value for ${shop.buys.join(", ")} (other shops pay 40%).` : "Buys back anything it sells."} What you sell goes on the shelves, to buy back.`} {game.player.familyId === 2 && shopId !== "capes" ? "Big family: 10% off." : ""}</p>
    </Modal>
  );
}
/** Rubbing a lamp of insight: pick the skill. */
export function LampModal({ game, refresh }: { game: Game; refresh: () => void }) {
  const slot = game.ui.lamp;
  if (slot === null) return null;
  const close = () => { game.ui.lamp = null; refresh(); };
  return (
    <Modal title="Lamp of insight" onClose={close}>
      <p>Choose a skill: you'll gain 100 × its level in experience.</p>
      <div className="realm-skills lamp">
        {SKILLS.map(skill => <button key={skill} type="button" className="realm-skill" aria-label={`${SKILL_NAMES[skill]}: ${(100 * levelForXp(game.player.xp[skill])).toLocaleString()} XP`}
          title={SKILL_NAMES[skill]} onClick={() => { rubLamp(game, slot, skill); refresh(); }}><PixelIcon art={skillArt(skill)} size={27} /><span>{levelForXp(game.player.xp[skill])}</span></button>)}
      </div>
    </Modal>
  );
}
/** Trading with another player: the offer screen, then the "are you sure?" screen. */
export function TradeModal({ game, view, onOffer, onAccept, onDecline, openMenu }: { game: Game; view: TradeView; onOffer: (id: string, n: number) => void; onAccept: () => void; onDecline: () => void; openMenu?: OpenMenu }) {
  const player = game.player, worth = (slots: readonly Slot[]) => slots.reduce((sum, slot) => sum + item(slot.id).value * slot.n, 0);
  const offered = (id: string) => view.mine.find(slot => slot.id === id)?.n ?? 0;
  const status = view.myAccept && view.theirAccept ? "" : view.myAccept ? "Waiting for the other player…" : view.theirAccept ? "Other player has accepted." : view.note;
  const grid = (slots: readonly Slot[], mine: boolean) => (
    <div className="realm-trade-grid">
      {slots.map(slot => <button key={slot.id} type="button" className="realm-slot" disabled={!mine || view.stage !== 1} aria-label={`${mine ? "Remove " : ""}${item(slot.id).name} × ${slot.n}`}
        onClick={() => mine && onOffer(slot.id, -1)}
        {...rightClick(openMenu, () => [...(mine && view.stage === 1 ? [1, 5, 10, Infinity].map(n => ({ verb: `Remove-${n === Infinity ? "All" : n}`, noun: item(slot.id).name, tone: "item", run: () => onOffer(slot.id, n === Infinity ? -1e9 : -n) })) : []),
          { verb: "Value", noun: item(slot.id).name, tone: "item", run: () => message(game, `${item(slot.id).name}: worth about ${item(slot.id).value.toLocaleString()} coins each.`) }, examine(game, slot.id, () => {})])}>
        <ItemIcon slot={slot} size={38} /></button>)}
      {!slots.length && <p className="realm-muted">Nothing yet.</p>}
    </div>
  );
  return (
    <Modal title={`Trading with Friend #${view.partner}`} onClose={onDecline} wide>
      <div className="realm-buttons realm-trade-buttons top"><button type="button" className="realm-primary" disabled={view.myAccept} onClick={onAccept}>Accept</button><button type="button" onClick={onDecline}>Decline</button>
        {status && <span className="realm-note" role="status">{status}</span>}</div>
      {view.stage === 1 ? <>
        <div className="realm-trade">
          <section><h3>Your offer <small>({worth(view.mine).toLocaleString()} coins)</small></h3>{grid(view.mine, true)}</section>
          <section><h3>Their offer <small>({worth(view.theirs).toLocaleString()} coins)</small></h3>{grid(view.theirs, false)}</section>
          <section><h3>Your pack <small>click to offer</small></h3>
            <div className="realm-inventory small">
              {player.inventory.map((slot, index) => {
                const left = slot ? count(player, slot.id) - offered(slot.id) : 0, can = !!slot && item(slot.id).tradeable !== false && left > 0;
                return <button key={index} type="button" className={`realm-slot${slot && !can ? " locked" : ""}`} aria-label={slot ? `Offer ${item(slot.id).name}` : `Empty slot ${index + 1}`}
                  onClick={() => { if (slot && can) onOffer(slot.id, 1); }}
                  {...rightClick(openMenu, () => slot && can ? [...[1, 5, 10, Infinity].map(n => ({ verb: `Offer-${n === Infinity ? "All" : n}`, noun: item(slot.id).name, tone: "item", run: () => onOffer(slot.id, n === Infinity ? 1e9 : n) })), examine(game, slot.id, () => {})] : [])}>
                  {slot && <ItemIcon slot={slot} size={34} />}</button>;
              })}
            </div>
          </section>
        </div>
      </> : <div className="realm-trade-confirm">
        <p><b>Are you sure you want to make this trade?</b></p>
        <div className="realm-trade">
          <section><h3>You are about to give:</h3><ul>{view.mine.map(slot => <li key={slot.id}>{item(slot.id).name} × {slot.n.toLocaleString()}</li>)}{!view.mine.length && <li>Absolutely nothing!</li>}</ul><small>Value: {worth(view.mine).toLocaleString()} coins</small></section>
          <section><h3>In return you will receive:</h3><ul>{view.theirs.map(slot => <li key={slot.id}>{item(slot.id).name} × {slot.n.toLocaleString()}</li>)}{!view.theirs.length && <li>Absolutely nothing!</li>}</ul><small>Value: {worth(view.theirs).toLocaleString()} coins</small></section>
        </div>
      </div>}
    </Modal>
  );
}
/** Skill guides (what unlocks at each level) and the recipe book (everything you can make). */
export function GuideModal({ game, skill, onSkill, onClose }: { game: Game; skill: Skill | null; onSkill: (skill: Skill | null) => void; onClose: () => void }) {
  const player = game.player, [search, setSearch] = useState(""), [makeable, setMakeable] = useState(false), [bookSkill, setBookSkill] = useState<Skill | "all">("all");
  const levelOf = (s: Skill) => levelForXp(player.xp[s]);
  const tabs = (
    <div className="realm-guide-skills" role="tablist" aria-label="Skills">
      {SKILLS.map(entry => <button key={entry} type="button" role="tab" aria-selected={skill === entry} title={SKILL_NAMES[entry]} aria-label={SKILL_NAMES[entry]} onClick={() => onSkill(entry)}><PixelIcon art={skillArt(entry)} size={22} /></button>)}
      <button type="button" role="tab" aria-selected={skill === null} className="realm-guide-book" onClick={() => onSkill(null)}>Recipe book</button>
    </div>
  );
  if (skill) {
    const entries = skillGuide(skill), level = levelOf(skill), next = entries.find(entry => entry.level > level);
    return (
      <Modal title={`${SKILL_NAMES[skill]} guide`} onClose={onClose} wide>
        {tabs}
        <p className="realm-muted">Your level: <b>{level}</b>{next ? ` · next unlock at ${next.level}: ${next.name}` : " · everything unlocked!"}</p>
        <ul className="realm-guide">
          {entries.map((entry, index) => {
            const open = level >= entry.level;
            return <li key={index} data-open={open} data-next={entry === next}>
              <b className="realm-guide-level">{entry.level}</b>
              {entry.icon ? <ItemIcon slot={{ id: entry.icon, n: 1 }} size={30} bare /> : entry.spell ? (() => { const spell = SPELLS.find(s => s.id === entry.spell)!; return <PixelIcon art={spellArt(spell.id, spell.element, spell.kind)} size={24} />; })() : <PixelIcon art={skillArt(skill)} size={22} />}
              <span><b>{entry.name}</b><small>{entry.detail}</small></span>
              {open && <i aria-label="Unlocked">✓</i>}
            </li>;
          })}
        </ul>
      </Modal>
    );
  }
  const has = (id: string, n: number) => count(player, id) >= n;
  const recipes = recipeBook().filter(recipe => (bookSkill === "all" || recipe.skill === bookSkill) && (!search || recipe.label.toLowerCase().includes(search.toLowerCase()) || Object.keys(recipe.inputs).some(id => item(id).name.toLowerCase().includes(search.toLowerCase())))
    && (!makeable || (levelOf(recipe.skill) >= recipe.level && Object.entries(recipe.inputs).every(([id, n]) => has(id, n)))));
  const skills = [...new Set(recipeBook().map(recipe => recipe.skill))];
  return (
    <Modal title="Recipe book" onClose={onClose} wide>
      {tabs}
      <div className="realm-bank-bar">
        <input type="search" placeholder="Search recipes or ingredients" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search recipes" />
        <select value={bookSkill} onChange={event => setBookSkill(event.target.value as Skill | "all")} aria-label="Skill">{["all", ...skills].map(entry => <option key={entry} value={entry}>{entry === "all" ? "All skills" : SKILL_NAMES[entry as Skill]}</option>)}</select>
        <label className="realm-check"><input type="checkbox" checked={makeable} onChange={event => setMakeable(event.target.checked)} /> Can make now</label>
      </div>
      <ul className="realm-guide recipes">
        {recipes.map((recipe, index) => {
          const level = levelOf(recipe.skill) >= recipe.level;
          return <li key={index} data-open={level}>
            <b className="realm-guide-level" title={SKILL_NAMES[recipe.skill]}>{recipe.level}</b>
            <ItemIcon slot={{ id: Object.keys(recipe.outputs)[0], n: Object.values(recipe.outputs)[0] }} size={30} bare />
            <span><b>{recipe.label}</b><small>{SKILL_NAMES[recipe.skill]} · {recipe.xp} XP · {recipe.where}{recipe.chance ? ` · ${Math.round(recipe.chance * 100)}% success` : ""}</small></span>
            <span className="realm-guide-inputs">{Object.entries(recipe.inputs).map(([id, n]) => <span key={id} data-have={has(id, n)} title={item(id).name}><ItemIcon slot={{ id, n: 1 }} size={24} bare />{n}</span>)}</span>
          </li>;
        })}
        {!recipes.length && <li className="realm-muted">No recipes match.</li>}
      </ul>
    </Modal>
  );
}
export function WorldMapModal({ game, onClose, onTravel }: { game: Game; onClose: () => void; onTravel: (x: number, y: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), underground = isUnderground(game.player.y), me = realPoint(game.world, game.player.x, game.player.y);
  const [focus, setFocus] = useState(() => ({ x: underground ? 130 : 165, y: underground ? 220 : 100, zoom: underground ? 3.2 : 2.1 }));
  const toTile = useRef<((x: number, y: number) => { x: number; y: number }) | null>(null), drag = useRef<{ x: number; y: number; fx: number; fy: number; moved: boolean } | null>(null);
  useEffect(() => {
    const node = canvas.current, ctx = node?.getContext("2d");
    if (!node || !ctx) return;
    node.width = 760; node.height = 470;
    toTile.current = renderWorldMap(ctx, game, node.width, node.height, focus, underground);
  }, [focus, game, underground]);
  const point = (event: ReactMouseEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * 760 / rect.width, y: (event.clientY - rect.top) * 470 / rect.height }; };
  const zoomBy = (factor: number) => setFocus(current => ({ ...current, zoom: Math.max(1.2, Math.min(10, current.zoom * factor)) }));
  const centre = () => setFocus(current => ({ ...current, x: me.x, y: me.y, zoom: Math.max(current.zoom, 4) }));
  useEffect(() => {
    const keys = (event: KeyboardEvent) => { if (event.key === "+" || event.key === "=") zoomBy(1.25); else if (event.key === "-" || event.key === "_") zoomBy(0.8); else if (event.key.toLowerCase() === "c") centre(); };
    window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys);
  });
  return (
    <Modal title={underground ? "World map: underground" : "World map of the Realm"} onClose={onClose} wide>
      <div className="realm-map-tools">
        <button type="button" onClick={() => zoomBy(1.3)} aria-label="Zoom in">+</button>
        <input type="range" min={12} max={100} value={Math.round(focus.zoom * 10)} onChange={event => setFocus({ ...focus, zoom: Number(event.target.value) / 10 })} aria-label="Map zoom" />
        <button type="button" onClick={() => zoomBy(0.77)} aria-label="Zoom out">−</button>
        <button type="button" onClick={centre}>Centre on me (C)</button>
        <button type="button" onClick={() => setFocus({ x: underground ? 130 : 120, y: underground ? 220 : 100, zoom: underground ? 3.2 : 2.3 })}>Whole Realm</button>
      </div>
      <canvas ref={canvas} className="realm-worldmap" aria-label="World map. Drag to pan, scroll to zoom, click to walk there."
        onMouseDown={event => { const p = point(event); drag.current = { x: p.x, y: p.y, fx: focus.x, fy: focus.y, moved: false }; }}
        onMouseMove={event => { const d = drag.current; if (!d || event.buttons !== 1) return; const p = point(event), dx = (p.x - d.x) / focus.zoom, dy = (p.y - d.y) / focus.zoom;
          if (Math.hypot(p.x - d.x, p.y - d.y) > 4) d.moved = true; setFocus({ ...focus, x: d.fx - (dx + dy) * Math.SQRT1_2, y: d.fy - (dy - dx) * Math.SQRT1_2 }); }}
        onMouseUp={event => { const d = drag.current; drag.current = null; if (d && !d.moved && toTile.current) { const p = point(event), tile = toTile.current(p.x, p.y); onTravel(tile.x, tile.y); } }}
        onWheel={event => zoomBy(event.deltaY < 0 ? 1.15 : 0.87)} />
      <p className="realm-note">Drag to pan · Scroll or +/− to zoom · C centres on you · Click to walk there</p>
    </Modal>
  );
}
export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Controls and tips" onClose={onClose}>
      <ul className="realm-help">
        <li><b>Left-click</b> does the first option (shown top-left). <b>Right-click</b> (or long-press) for every option.</li>
        <li><b>WASD</b> walks. <b>← →</b> turn the camera, <b>↑ ↓</b> tilt it from overhead right down to ground level; or <b>drag with the scroll wheel held</b>. Scroll zooms in close (up to 3×). Click the <b>compass</b> to face north.</li>
        <li><b>R</b> toggles run. <b>Scroll</b> zooms. <b>M</b> opens the world map.</li>
        <li><b>F1–F9</b> or the icons switch tabs. <b>Enter</b> to chat. <b>Space</b> continues dialogue, <b>1–5</b> pick options. <b>Esc</b> closes.</li>
        <li><b>Use</b> an item, then click another item or object: raw fish on a range, tinderbox on logs, needle on leather, chisel on a gem.</li>
        <li>Train <b>15 skills</b> to 99 on the old-school XP curve (Realm rate ×3). Your Friend's family adds a perk.</li>
        <li><b>Seven quests</b>, from A Friend's Feast to The Hollow King. Look for yellow markers over quest givers.</li>
        <li><b>Rare Caskets</b> use simulated $RAREFRIENDS: relics give bonuses while kept, and the wardrobe dresses your Friend.</li>
        <li>Your adventure saves automatically for this wallet on this device.</li>
      </ul>
    </Modal>
  );
}
export function Orbs({ game, onRun, onRide, onMap, onZoom, onRotate, openMenu }: { game: Game; onRun: () => void; onRide?: (id?: string) => void; onMap: () => void; onZoom: (delta: number) => void; onRotate: (delta: number) => void; openMenu?: OpenMenu }) {
  const player = game.player, hpFraction = player.hp / maxHp(player), prayerFraction = player.prayer / Math.max(1, maxPrayer(player));
  const orbMenu = (label: string): MenuEntry[] => label === "Hitpoints" ? [{ verb: "Check", noun: "Hitpoints", run: () => message(game, `Hitpoints: ${player.hp} / ${maxHp(player)}.`) }]
    : label === "Prayer" ? [{ verb: "Deactivate", noun: "Prayers", run: () => { player.prayers = []; } }, { verb: "Check", noun: "Prayer", run: () => message(game, `Prayer points: ${Math.ceil(player.prayer)} / ${maxPrayer(player)}.`) }]
    : [{ verb: player.run ? "Walk" : "Run", noun: "", run: onRun }, { verb: "Check", noun: "Run energy", run: () => message(game, `Run energy: ${Math.floor(player.energy)}%.`) }];
  const orb = (label: string, value: number, fraction: number, color: string, art: HTMLCanvasElement, onClick?: () => void, pressed?: boolean) => (
    <button type="button" className="realm-orb" onClick={onClick} disabled={!onClick && !openMenu} aria-pressed={pressed} aria-label={`${label}: ${value}`} title={label} {...rightClick(openMenu, () => orbMenu(label))}>
      <b>{value}</b><i style={{ background: `conic-gradient(${color} ${Math.round(fraction * 360)}deg, #3a3835 0)` }}><PixelIcon art={art} size={18} /></i>
    </button>
  );
  return (
    <div className="realm-orbs">
      {orb("Hitpoints", player.hp, hpFraction, "#cf6e6e", orbArt("hitpoints"))}
      {orb("Prayer", Math.ceil(player.prayer), prayerFraction, "#9fb4d0", orbArt("prayer"))}
      {orb(player.run ? "Run: on" : "Run: off", Math.floor(player.energy), player.energy / 100, player.run ? "#e2c46a" : "#9a968f", orbArt(player.run ? "run" : "walk"), onRun, player.run)}
      {onRide && player.mounts.length > 0 && (() => { const shown = mountDef(player.mount ?? player.lastMount ?? player.mounts[0])!;
        return <button type="button" className="realm-orb map ride" onClick={() => onRide()} aria-pressed={!!player.mount} aria-label={player.mount ? `Dismount (H)` : `Ride your ${shown.name.toLowerCase()} (H)`} title={player.mount ? "Dismount (H)" : "Ride (H)"}
          {...rightClick(openMenu, () => [...player.mounts.map(id => ({ verb: player.mount === id ? "Dismount" : "Ride", noun: mountDef(id)!.name, run: () => onRide(id) }))])}><PixelIcon art={mountArt(shown.coat, "side", -1, true)} size={26} /></button>; })()}
      <button type="button" className="realm-orb map" onClick={onMap} aria-label="World map (M)" title="World map (M)" {...rightClick(openMenu, () => [{ verb: "Open", noun: "World map", run: onMap }])}><PixelIcon art={orbArt("map")} size={22} /></button>
      <div className="realm-zoom"><button type="button" onClick={() => onZoom(0.12)} aria-label="Zoom in">+</button><button type="button" onClick={() => onZoom(-0.12)} aria-label="Zoom out">−</button></div>
      <div className="realm-zoom"><button type="button" onClick={() => onRotate(-Math.PI / 4)} aria-label="Turn the camera left" title="Turn left (←)">⟲</button><button type="button" onClick={() => onRotate(Math.PI / 4)} aria-label="Turn the camera right" title="Turn right (→)">⟳</button></div>
    </div>
  );
}

// ---------- The daily popup: the streak and challenges, and the update log ----------
export type DailyTab = "daily" | "updates" | "achievements";
export function DailyModal({ game, tab, onTab, onClose, refresh, openMenu }: { game: Game; tab: DailyTab; onTab: (tab: DailyTab) => void; onClose: () => void; refresh: () => void; openMenu?: OpenMenu }) {
  const now = Date.now(), player = game.player;
  player.stats.dailyOpened = 1; // first steps: you've found the Realm Daily
  rollDaily(game, now);
  const status = streakStatus(game, now), daily = player.daily;
  // Updates newer than the last one you'd seen when this opened stay marked New while it's open.
  const [newSince] = useState(player.seenUpdate), unseen = LATEST_UPDATE > player.seenUpdate;
  useEffect(() => { if (tab === "updates" && player.seenUpdate < LATEST_UPDATE) { player.seenUpdate = LATEST_UPDATE; refresh(); } }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const untilReset = (Math.floor(now / DAY_MS) + 1) * DAY_MS - now, resetText = `${Math.floor(untilReset / 3_600_000)}h ${Math.floor(untilReset / 60_000) % 60}m`;
  // The week of the cycle you're on: days already claimed, today's (to claim or claimed), and the days ahead.
  const cycleStart = Math.floor((status.next - 1) / 7) * 7 + 1;
  const iconOf = (day: number) => { const reward = streakReward(day), [id, n] = reward.items?.[reward.items.length - 1] ?? ["coins", reward.coins ?? 0]; return { id, n }; };
  const claim = () => { claimStreak(game, now); refresh(); if (unseen) window.setTimeout(() => onTab("updates"), 900); };
  const done = daily.claimed.length > 0 && daily.claimed.every(Boolean);
  return (
    <Modal title="The Realm Daily" onClose={onClose} wide>
      <div className="realm-daily-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "daily"} onClick={() => onTab("daily")}>🔥 Daily streak{dailyWaiting(game, now) && <i className="realm-dot" aria-label="(something to claim)" />}</button>
        <button type="button" role="tab" aria-selected={tab === "updates"} onClick={() => onTab("updates")}>📜 Updates{unseen && <i className="realm-dot" aria-label="(new)" />}</button>
        <button type="button" role="tab" aria-selected={tab === "achievements"} onClick={() => onTab("achievements")}>🏆 Achievements <small>{achieved(game)}/{ACHIEVEMENTS.length}</small></button>
      </div>
      {tab === "achievements" ? (
        <div className="realm-achievements">
          {[...new Set(ACHIEVEMENTS.map(entry => entry.group))].map(group => <section key={group}><h3>{group}</h3><ul>
            {ACHIEVEMENTS.filter(entry => entry.group === group).map(entry => { const day = player.achievements[entry.id];
              return <li key={entry.id} className={day !== undefined ? "done" : ""} title={entry.text}
                {...rightClick(openMenu, () => [{ verb: "Examine", noun: entry.name, run: () => { message(game, `${entry.name}: ${entry.text}${day !== undefined ? ` Earned ${new Date(day * DAY_MS).toISOString().slice(0, 10)}.` : ""}`); refresh(); } }])}>
                <b className="realm-badge">{day !== undefined ? entry.icon : "?"}</b><div><b>{entry.name}</b><small>{entry.text}</small>{day !== undefined && <em>Earned {new Date(day * DAY_MS).toISOString().slice(0, 10)}</em>}</div>
              </li>; })}
          </ul></section>)}
        </div>
      ) : tab === "daily" ? (
        <div className="realm-daily">
          <div className="realm-streak-head">
            <b>{status.canClaim ? (status.reset ? "Your streak ended. Start a new one today!" : status.streak ? `Day ${status.streak} streak. Keep it going!` : "Start your streak today!") : `🔥 Day ${daily.streak} streak`}</b>
            <small>Best {Math.max(daily.best, daily.streak)} days · a new day in {resetText} (midnight UTC)</small>
          </div>
          {(() => { const boss = bossWindow(now), left = boss.active ? boss.end - now : boss.next - now, h = Math.floor(left / 3_600_000), m = Math.floor(left / 60_000) % 60;
            return <p className={`realm-boss-line${boss.active ? " up" : ""}`}>☠ <b>World boss:</b> {boss.active ? `the Ashen Colossus is up in Wyrmreach for ${m} more minute${m === 1 ? "" : "s"}. Everyone who wounds it shares the loot!` : `the Ashen Colossus rises in Wyrmreach in ${h ? `${h}h ` : ""}${m}m.`}</p>; })()}
          <ol className="realm-streak">
            {Array.from({ length: 7 }, (_, i) => cycleStart + i).map(day => {
              const claimed = status.canClaim ? day < status.next : day <= daily.streak, today = day === status.next, icon = iconOf(day);
              return <li key={day} className={`${claimed ? "claimed" : ""}${today ? " today" : ""}${day % 7 === 0 ? " big" : ""}`} title={`Day ${day}: ${rewardText(streakReward(day))}`}
                {...rightClick(openMenu, () => [{ verb: "Examine", noun: `Day ${day}`, run: () => { message(game, `Day ${day} of your streak: ${rewardText(streakReward(day))}.`); refresh(); } }])}>
                <small>Day {day}</small><ItemIcon slot={{ id: icon.id, n: icon.n }} size={40} bare />{claimed && <em aria-label="claimed">✓</em>}
              </li>;
            })}
          </ol>
          <div className="realm-buttons">
            {status.canClaim ? <button type="button" className="realm-primary big" onClick={claim}>Claim day {status.next}: {rewardText(status.reward)}</button>
              : <span className="realm-muted">Today's reward is claimed. Come back tomorrow for day {daily.streak + 1}: {rewardText(streakReward(daily.streak + 1))}.</span>}
          </div>
          <h3>Today's challenges <small>(the same for everyone)</small></h3>
          <ul className="realm-challenges">
            {daily.challenges.map((challenge, i) => {
              const progress = challengeProgress(game, i), complete = progress >= challenge.target, reward = challengeReward(game, challenge);
              return <li key={i} className={daily.claimed[i] ? "claimed" : complete ? "complete" : ""}>
                <div><b>{challengeText(challenge)}</b><small>{rewardText(reward)}{challenge.kind === "xp" ? ` + ${Math.round(challenge.target * 0.1).toLocaleString()} XP` : ""}</small>
                  <span className="realm-bar" role="progressbar" aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={progress}><i style={{ width: `${(progress / challenge.target) * 100}%` }} /><em>{progress.toLocaleString()} / {challenge.target.toLocaleString()}</em></span></div>
                {daily.claimed[i] ? <span className="realm-done">✓ Done</span> : <button type="button" className={complete ? "realm-primary" : ""} disabled={!complete}
                  {...rightClick(openMenu, () => [...(complete ? [{ verb: "Claim", noun: challengeText(challenge), run: () => { claimChallenge(game, i); refresh(); } }] : []), { verb: "Examine", noun: challengeText(challenge), run: () => { message(game, `${challengeText(challenge)}: ${progress.toLocaleString()} of ${challenge.target.toLocaleString()} so far today.`); refresh(); } }])}
                  onClick={() => { claimChallenge(game, i); refresh(); }}>Claim</button>}
              </li>;
            })}
            <li className={daily.chest ? "claimed" : done ? "complete" : ""}>
              <div><b>🎁 Daily chest</b><small>Finish all three challenges: {rewardText(CHEST_REWARD)}</small></div>
              {daily.chest ? <span className="realm-done">✓ Opened</span> : <button type="button" className={done ? "realm-primary" : ""} disabled={!done} onClick={() => { claimChest(game); refresh(); }}>Open</button>}
            </li>
          </ul>
        </div>
      ) : (
        <div className="realm-updates">
          {UPDATES.map(update => (
            <article key={update.id} className={update.id > newSince ? "new" : ""}>
              <div className="realm-update-head"><b>{update.title}</b>{update.id > newSince && <span className="realm-new">New</span>}<small>{update.date}</small></div>
              <ul>{update.items.map((line, i) => <li key={i}>{line}</li>)}</ul>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---------- First steps: the guided start's card ----------
export function FirstStepsCard({ game, onSkip, openMenu }: { game: Game; onSkip: () => void; openMenu?: OpenMenu }) {
  const step = currentStep(game), [open, setOpen] = useState(true);
  if (!step) return null;
  const index = game.player.guide;
  return (
    <aside className={`realm-steps${open ? "" : " closed"}`} aria-label="First steps" {...rightClick(openMenu, () => [{ verb: open ? "Hide" : "Show", noun: "First steps", run: () => setOpen(!open) }, { verb: "Skip", noun: "First steps", run: onSkip }])}>
      <header><b>📜 First steps</b><small>{index + 1} / {FIRST_STEPS.length}</small>
        <button type="button" aria-label={open ? "Hide the guide" : "Show the guide"} onClick={() => setOpen(!open)}>{open ? "–" : "+"}</button></header>
      {open && <><h4>{step.title}</h4><p>{step.text}</p>
        <div className="realm-steps-bar" aria-hidden="true">{FIRST_STEPS.map((entry, i) => <i key={entry.id} className={i < index ? "done" : i === index ? "now" : ""} />)}</div>
        <p className="realm-steps-foot">{step.target ? "Follow the gold arrow. " : ""}Finish for 500 coins and a Lamp of insight. <button type="button" className="realm-link" onClick={onSkip}>Skip guide</button></p></>}
    </aside>
  );
}
