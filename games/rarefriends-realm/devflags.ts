/**
 * The development game's switches (devtools.ts sets them; the engine reads them). A leaf: it imports nothing.
 * They're only ever turned on inside a development frame (game.html?dev=1, devlayer.ts), and turning any of them on puts
 * the session in the sandbox: nothing is saved, and other players don't see you (index.tsx), so nothing done with them
 * reaches a real save, the hiscores, a card or anyone else.
 */
export const devFlags = {
  /** Nothing hurts you. */
  god: false,
  /** Walk anywhere in bounds: walls, water and cliffs included. */
  noclip: false,
  /** Something was changed by hand (an item given, a level set, a quest moved…): this session no longer saves. */
  sandbox: false,
};
