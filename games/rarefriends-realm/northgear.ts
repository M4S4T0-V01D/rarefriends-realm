/**
 * What the north wears (A Place to the North). The Vargskeld in wool against the fjord wind: moss-green hoods, tunics
 * hemmed with tablet-woven bands, trousers wound to the knee, a cloak pinned at the right shoulder, the women's apron
 * dresses held with a pair of brooches. The Zoryavik in embroidered linen and red: the rubakha and the sarafan, fur
 * kolpaks and pearled kokoshniks, bast shoes for the mud and red boots for the town. Ragnhild weaves the Vargskeld's in
 * Skarnholm, Yaroslava embroiders the Zoryavik's in Krasnogor (data.ts puts these into REGIONAL_CLOTHING and SHOPS), and
 * everyone in the north is dressed in them (render.ts NPC_WEAR).
 */
import type { RegionalSet, ShopDef } from "./data.ts";

export const NORTH_CLOTHING: readonly RegionalSet[] = [
  { region: "vargskeld", shop: "skarnholm_weaver", pieces: [
    { id: "vargskeld_hood", name: "Vargskeld hood", slot: "head", shape: "hood", color: "#5a6b4e", accent: "#c9a46a", examine: "A hood of thick moss-green wool with a short cape at the shoulders, tablet-woven at the edge. The fjord wind finds every other kind.", value: 280 },
    { id: "wolf_fur_hat", name: "Wolf-fur hat", slot: "head", shape: "hat", kind: "fur", color: "#4a4a52", accent: "#9a9590", examine: "A round cap of dark wool under a deep band of grey wolf fur. The wolf had opinions about it; the hat outlasted them.", value: 420 },
    { id: "vargskeld_tunic", name: "Vargskeld tunic", slot: "body", shape: "body", kind: "tunic", color: "#8a5a3a", accent: "#e3b23c", examine: "A knee-length wool tunic, its hem and cuffs bound with a tablet-woven band in the family's colours.", value: 520 },
    { id: "apron_dress", name: "Apron dress", slot: "body", shape: "body", kind: "dress", color: "#3f6a7a", accent: "#d9b866", examine: "A wool overdress on two straps, pinned at the shoulders with a pair of bronze brooches and a string of glass beads between them.", value: 640 },
    { id: "wrapped_trousers", name: "Wrapped trousers", slot: "legs", shape: "legs", kind: "trousers", color: "#6e6a5a", accent: "#c8c5be", examine: "Loose wool trousers, wound from ankle to knee with linen wraps against the snow.", value: 300 },
    { id: "fur_mantle", name: "Fur-trimmed mantle", slot: "cape", shape: "cape", color: "#3f4a5a", accent: "#c9b48a", examine: "A heavy blue-grey cloak with fur at the collar, pinned at the right shoulder so the sword arm's free.", value: 700 },
    { id: "turnshoes", name: "Turnshoes", slot: "feet", shape: "boots", color: "#5a4232", accent: "#8a6a46", examine: "Soft leather shoes sewn inside out and turned, laced at the ankle.", value: 200 },
  ] },
  { region: "zoryavik", shop: "krasnogor_tailor", pieces: [
    { id: "fur_kolpak", name: "Fur kolpak", slot: "head", shape: "hat", kind: "fur", color: "#9a3b2c", accent: "#5a4232", examine: "A tall cap of red felt with a deep band of sable round it. A prince's is taller; a merchant's is redder.", value: 480 },
    { id: "kokoshnik", name: "Kokoshnik", slot: "head", shape: "hat", kind: "kokoshnik", color: "#9a3b2c", accent: "#f7f5f0", examine: "A tall arched headdress of red velvet, its edge sewn with river pearls, a veil falling behind. Worn on feast days, and by anyone who wants it to be one.", value: 900 },
    { id: "rubakha", name: "Embroidered rubakha", slot: "body", shape: "body", kind: "tunic", color: "#efe8dc", accent: "#b3301f", examine: "A long linen shirt, belted, fastened at the side of the collar, the cuffs and hem worked in red thread: birds, trees, the sun.", value: 480 },
    { id: "sarafan", name: "Sarafan", slot: "body", shape: "body", kind: "dress", color: "#9a3b2c", accent: "#d9b866", examine: "A long red pinafore dress over a white shirt, a row of gilt buttons down the front.", value: 700 },
    { id: "linen_porty", name: "Linen porty", slot: "legs", shape: "legs", kind: "trousers", color: "#c8c0b0", accent: "#5a4232", examine: "Loose linen trousers, tucked into the boots or the bast shoes, whichever the day calls for.", value: 260 },
    { id: "wool_svita", name: "Wool svita", slot: "cape", shape: "cape", color: "#6e3f2e", accent: "#d9b866", examine: "A long brown coat of felted wool, worn over the shoulders, its edges trimmed with gold braid.", value: 640 },
    { id: "bast_shoes", name: "Bast shoes", slot: "feet", shape: "boots", color: "#c9a46a", accent: "#8a6a46", examine: "Shoes woven from lime bast, laced up the shin with cord. Light, cheap, and good for a week of mud.", value: 120 },
    { id: "red_boots", name: "Red boots", slot: "feet", shape: "boots", color: "#8a2a22", accent: "#d9b866", examine: "Red leather boots, the toes turned up a little, for the town and for being seen in it.", value: 520 },
  ] },
];
const set = (region: string) => NORTH_CLOTHING.find(entry => entry.region === region)!.pieces.map(piece => piece.id);
export const NORTH_SHOPS: Record<string, ShopDef> = {
  skarnholm_weaver: { id: "skarnholm_weaver", name: "Ragnhild's loom", buys: ["other"], rate: 0.5, stock: set("vargskeld") },
  krasnogor_tailor: { id: "krasnogor_tailor", name: "Yaroslava's needle", buys: ["other"], rate: 0.5, stock: set("zoryavik") },
};
