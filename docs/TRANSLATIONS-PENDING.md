# Translations still to do

Stage 6a (the sea ports: Gullwick, Saltreach, Merrab, Tel Ashun, Ennu's Well, and their packet boats) shipped before
all its text was translated. The English texts still waiting are listed in
`games/rarefriends-realm/lang/pending.ts`: about 50 lines of quest text and talk, two item names and update 104.

To finish: translate each one into all twelve languages (ja ko zh-CN zh-TW vi id th tr es pt-BR ru uk, the order of
`TABLE_LANGUAGES`), add the rows to `lang/ports1.ts` (short texts) or `lang/ports2.ts` (long ones), and take them off
the pending list. The i18n tests let listed texts through in English; when the list is empty, delete this note.

Two entries look like generated labels rather than finished text ("ennu's well local", "tel ashun local"); check where
they come from before translating them.
