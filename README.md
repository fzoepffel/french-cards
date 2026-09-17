# Neno

**Neno — Französisch: Vokabeln, Formen, Grammatik**

Flashcards for German speakers learning French at B1 and up: vocabulary with its gender, verb forms, prepositions, and grammar learned through sentences. Installable web app, works offline, progress stays on the device.

*Neno* is Swahili for **word**. The name belongs to no European language, so a Spanish or Italian edition keeps the same brand.

- What it teaches: [CURRICULUM.md](CURRICULUM.md)
- Cards: `src/data/cards.json`, checked with `npm run validate`
- Develop: `npm install`, then `npm run dev`
- Deploys to GitHub Pages on every push to `main`

## Install on iPhone

Open the site in Safari, tap Share, then "Zum Home-Bildschirm". The app appears as **Neno**.

## Content pipeline

Cards come from three places: hand-written cards, verb forms taken straight from Lexique, and drafts written by Claude that are spot-checked before import. Drafts live in `pipeline/out/` (not committed) until imported.

```bash
npm run cards:fetch                      # download Lexique 3.83 once (~26 MB)
npm run cards:wordlist -- --from 1500    # inspect the frequency list
npm run cards:conjugations -- --verbs 60 # verb-form cards, no AI
npm run cards:generate -- words --from 1500 --count 40          # needs .env
npm run cards:generate -- topic --topic si-saetze --count 12    # needs .env
npm run cards:show -- pipeline/out/drafts/FILE.json --sample 30
npm run cards:import -- pipeline/out/drafts/FILE.json --reject id1,id2
npm run validate
```

`cards:generate` uses Claude Opus 5 and prints the cost of each run. Add `--dry-run` to see the prompt without calling the API.

## Credits

Word frequencies, genders and verb forms: [Lexique 3.83](http://www.lexique.org) by Boris New and Christophe Pallier, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
