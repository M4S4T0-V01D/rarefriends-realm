/**
 * The Mysteries journal (the Quest journal tab's third page): what you've discovered, each in three parts (what you saw,
 * what you came to understand, what you still don't), the Azhurak glyphs you've met (their shapes, and what they mean
 * once you know), and the inscriptions you've read or half read. Only what you've found is in it.
 */
import React from "react";
import { level, type Game } from "./state.ts";
import { DISCOVERIES, GLYPHS, INSCRIPTIONS, glyphState, type DiscoveryKind } from "./mysteries.ts";
import { artUrl } from "./icons.ts";
import { pixelArt, type Pixels } from "./pixel.ts";

const INK = "#2f3f66";
/** Each Azhurak glyph drawn as it's cut: lapis on stone. */
const GLYPH_DRAW: Record<string, (p: Pixels) => void> = {
  sun: p => { p.disc(5.5, 5.5, 4.5, 4.5, INK, null); p.disc(5.5, 5.5, 3.2, 3.2, "#efe6d2", null); p.set(5, 5, INK); p.set(6, 5, INK); p.set(5, 6, INK); p.set(6, 6, INK); },
  road: p => { p.line(1, 4, 10, 3, INK); p.line(1, 7, 10, 6, INK); },
  below: p => { p.line(1, 3, 10, 3, INK); p.poly([[3.5, 4], [7.5, 4], [5.5, 9]], INK, null); },
  door: p => { p.line(2, 10, 2, 4, INK); p.line(9, 10, 9, 4, INK); p.line(2, 4, 4, 2, INK); p.line(9, 4, 7, 2, INK); },
  water: p => { for (const y of [2, 5, 8]) { p.line(1, y + 1, 3, y, INK); p.line(3, y, 5, y + 1, INK); p.line(5, y + 1, 7, y, INK); p.line(7, y, 9, y + 1, INK); } },
  star: p => { p.set(5, 5, INK); for (const [x, y] of [[5, 1], [9, 4], [8, 9], [2, 9], [1, 4], [5, 10]]) p.set(x, y, INK); },
  eye: p => { p.line(1, 5, 5, 2, INK); p.line(5, 2, 9, 5, INK); p.line(1, 5, 5, 8, INK); p.line(5, 8, 9, 5, INK); p.disc(5, 5, 1.2, 1.2, INK, null); },
  stone: p => { p.rect(2, 2, 7, 7, INK); },
  name: p => { p.disc(5.5, 5.5, 4.5, 4.5, INK, null); p.disc(5.5, 5.5, 3.3, 3.3, "#efe6d2", null); p.rect(5, 0, 2, 3, "#efe6d2"); },
  first: p => { p.line(5, 2, 5, 10, INK); p.line(3, 2, 8, 2, INK); },
  many: p => { for (const x of [2, 5, 8]) p.disc(x + 0.5, 5.5, 1.1, 1.1, INK, null); },
  measure: p => { p.line(1, 4, 10, 4, INK); p.poly([[5.5, 5], [3.5, 9], [7.5, 9]], INK, null); },
};
const glyphArt = (id: string) => pixelArt(`glyph:${id}`, 12, 12, p => { p.rect(0, 0, 12, 12, "#efe6d2"); GLYPH_DRAW[id]?.(p); });
const Glyph = ({ id }: { id: string }) => <img className="pixel realm-glyph" src={artUrl(glyphArt(id))} width={24} height={24} alt="" aria-hidden draggable={false} />;

const KIND_LABEL: Record<DiscoveryKind, string> = { inscription: "Inscriptions", phenomenon: "Phenomena", site: "Places", being: "Beings", contradiction: "Contradictions", rite: "Rites" };

export function MysteriesJournal({ game }: { game: Game }) {
  const record = game.player.mysteries, found = Object.keys(record.found).map(id => DISCOVERIES[id]).filter(Boolean);
  const seen = GLYPHS.filter(glyph => glyphState(game, glyph.id) > 0), understood = seen.filter(glyph => glyphState(game, glyph.id) === 2);
  const inscriptions = Object.values(INSCRIPTIONS).filter(inscription => inscription.glyphs.some(glyph => glyphState(game, glyph) > 0));
  return (
    <div className="realm-quests realm-mysteries">
      <p className="realm-muted">{`Mysteries ${level(game, "mysteries")}`} · {`${found.length} discoveries`} · {`${understood.length} of ${seen.length} glyphs understood`}</p>
      {found.length === 0 && seen.length === 0 && <p className="realm-note">Mysteries is what you find out for yourself: strange places, old inscriptions, things the world doesn't explain. Look closely at what doesn't fit.</p>}
      {(Object.keys(KIND_LABEL) as DiscoveryKind[]).map(kind => {
        const list = found.filter(entry => entry.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h4>{KIND_LABEL[kind]}</h4>
            {list.map(entry => (
              <div key={entry.id} className="realm-discovery">
                <b>{entry.name}</b>
                <dl className="realm-facts">
                  <dt>Seen</dt><dd>{entry.observed}</dd>
                  {entry.learned && <><dt>Understood</dt><dd>{entry.learned}</dd></>}
                  {entry.uncertain && <><dt>Still unknown</dt><dd className="realm-unknown">{entry.uncertain}</dd></>}
                </dl>
              </div>
            ))}
          </section>
        );
      })}
      {seen.length > 0 && (
        <section>
          <h4>Azhurak glyphs</h4>
          <ul className="realm-glyphs">
            {seen.map(glyph => (
              <li key={glyph.id}><Glyph id={glyph.id} /><span>{glyphState(game, glyph.id) === 2 ? <><b>{glyph.meaning}</b> <small>{glyph.looks}</small></> : <span className="realm-unknown">{glyph.looks}: meaning unknown</span>}</span></li>
            ))}
          </ul>
        </section>
      )}
      {inscriptions.length > 0 && (
        <section>
          <h4>Inscriptions</h4>
          {inscriptions.map(inscription => (
            <div key={inscription.id} className="realm-discovery">
              <b>{inscription.name}</b> <small className="realm-muted">{inscription.where}</small>
              <p className="realm-glyph-row">{inscription.glyphs.map((glyph, index) => <Glyph key={index} id={glyph} />)}</p>
              <p className={inscription.id in record.read ? undefined : "realm-unknown"}>{inscription.id in record.read ? `"${inscription.reading}"` : inscription.glyphs.map(glyph => glyphState(game, glyph) === 2 ? GLYPHS.find(each => each.id === glyph)!.meaning.split(",")[0] : "?").join(" · ")}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
