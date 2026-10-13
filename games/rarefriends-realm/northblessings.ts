/**
 * The north's blessings, as a table (northfaith.ts gives them and says what they do). A leaf: it imports nothing, so the
 * skill guides (and the preview site's) can list them without pulling in the game's people and quests.
 */
export type FaithId = "ember" | "bough";
export type BlessingId = "guest_right" | "crossing_oath" | "remembered_name" | "hearth_warmth" | "ancestors_watch" | "boughs_year";
export type Blessing = { id: BlessingId; faith: FaithId; name: string; level: number; text: string };
export const BLESSINGS: Record<BlessingId, Blessing> = {
  guest_right: { id: "guest_right", faith: "ember", name: "Guest-right", level: 10, text: "Food heals a quarter more." },
  crossing_oath: { id: "crossing_oath", faith: "ember", name: "The Crossing Oath", level: 25, text: "Running tires you a quarter less." },
  remembered_name: { id: "remembered_name", faith: "ember", name: "The Remembered Name", level: 45, text: "Once, a blow that would fell you leaves you standing, at a quarter of your health." },
  hearth_warmth: { id: "hearth_warmth", faith: "bough", name: "Hearth-warmth", level: 10, text: "Hitpoints come back twice as fast." },
  ancestors_watch: { id: "ancestors_watch", faith: "bough", name: "The Ancestors' Watch", level: 25, text: "A tenth of every blow is turned aside." },
  boughs_year: { id: "boughs_year", faith: "bough", name: "The Bough's Year", level: 45, text: "One pick in five, a second herb." },
};
export const BLESSING_IDS = Object.keys(BLESSINGS) as BlessingId[];
