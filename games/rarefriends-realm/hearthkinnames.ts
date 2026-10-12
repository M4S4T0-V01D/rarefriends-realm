/**
 * The Hearthkin's names that the world generator and the engine need without the people (hearthkin.ts imports the
 * whole game; world.ts can't): the quests' ids, the stations the quests' rewards work at, and Oddhand's gauge.
 */
export const FELLOWS_TRIAL = "fellows_trial", ELDER_ANVIL = "elder_anvil", COLD_QUENCH = "cold_quench", VEINS = "veins_of_the_shoulder";
/** The stations (hearthkinworld.ts places them; engine.ts produceTick applies them). */
export const GUILD_FURNACE = "Guild furnace", ELDER_ANVIL_NAME = "Elder anvil", COLD_QUENCH_ANVIL = "Coldhammer's anvil";
/** The rocks Oddhand's gauge listens to: they come back a third sooner for whoever carries it. */
export const GAUGE_ROCKS = new Set(["moonsilver", "glimmer", "rarite"]), GAUGE_RESPAWN = 2 / 3;
