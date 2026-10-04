# Fellowship art

Each fellowship can have a logo and a background on its members' adventurer cards. Put them in a folder named
after the fellowship's tag (capitals and digits, 2–5 characters), exactly as it shows in the game:

```
fellowships/
  VOID/
    logo.png   a square picture, 96 × 96 or larger (shown at 72 × 72 beside the card's header)
    bg.png     a wide picture, about 620 × 72 (the band behind the card's header; it is cropped to fit)
```

The fellowship's founder sends both pictures (or a pull request adding them). The game loads them from the
site's `preview/fellowships/<TAG>/` folder, so anyone wearing the tag sees them on their card once the site
has deployed. Keep them small (under 200 KB each) and in PNG.
