# Definitely Wizards

Everyone knows the proper way to gain arcane abilities is through discipline and years of study. Magic is temperamental, and it's too dangerous to let anybody who just happens to have "inner power" cast spells. Wizards who have worked studiously and been tested on their capabilities are the only ones we can trust with that power.

Unfortunately for you, this means all other sources of magic have been declared illegal. If you want to take jobs where spellcasting is a requirement, you must be a licensed wizard. Your party has completed the paperwork and written test and now face the final challenge: completing the Wizard Certification Practical Exam.

## Description

Definitely Wizards is a rules-light TTRPG about pretending to be a wizard by Elliot HT available to purchase at [https://elliothtart.itch.io/definitely-wizards](https://elliothtart.itch.io/definitely-wizards). This system supports **Foundry VTT v14** and includes interactive character/item sheets, automated stat rules, compendiums, and GM exam-generation tools.

### For Players

- **Attributes & Props:** Open the actor the GM created for you. On the **Attributes** tab, select or roll your **Class** (`1d11`) and starting **Props** (`1d6`), read Prop descriptions/hints, and click **Add to Props** to add them to your inventory.
- **Wizard & Wild Rolls:** Click the single (`1d6`) or double (**Wit Bonus**, `2d6kl` keeping the lower die) dice icon next to **Wizard** or **Wild**—cast directly from the **Spells** tab—or drag them (along with any **Spell** or **Prop**, or the **Player Macros** compendium) onto your hotbar (`Shift`-click any `1d6` or hotbar Spell macro to cast with **Wit Bonus**).
- **Spells & Costuming:** New characters start with the 10 low-grade Wizard spells (with an **Add Starting Spells** button if any are missing), and can roll improvised **Wild Spells** from the Spells tab. Props can be used for **Costuming** (`+1 Wizard` or `-1 Wild`) from the Props list or chat cards.
- **Lockouts, Arrests & Chat Actions:** Reaching `6` in Wizard or Wild locks that spell type until you succeed on the opposite stat (resetting the locked stat to `2`). Reaching `Wild > 6`, or having the whole party at `Wild = 6` simultaneously, triggers an arrest alert. Failed roll cards include **Roll for Consequences** and **Cover (+1 Wild)** buttons, while successful Wild rolls offer **Couldn't Disguise (+1 Wild)**.

### For GMs

- **Exam & Monster Factory RollTables:** Eight RollTables (`Judge`, `RoomType`, `MainObstacle`, `AddedChallenge`, `Surprise`, `FinalTest`, `MonsterFactoryCreature`, and `MonsterFactoryTrait`) are imported into the world on first launch.
- **Practical Exam Generator:** Run the **Generate Practical Exam** macro from the **GM Helpers** compendium (or `game.definitelyWizards.generatePracticalExam()`) to generate a 4-chamber exam—with optional auto-rerolls on `6` and a Chamber 4 Monster Factory boss—as a GM Journal Entry or whispered chat message.
- **Compendiums:** Includes **Spells**, **Props**, **Player Macros**, and **GM Helpers** (full game rules are available at the itch.io link above).

## Development

Requires **Node.js 24** (see `mise.toml`).

- `npm install` — install dev dependencies (`@biomejs/biome`, `typescript`, `lefthook`).
- `npm run check` — run Biome checks (`npm run lint`), TypeScript `checkJs` typecheck (`npm run typecheck`), and Foundry v14 static & pack manifest verification (`npm run check:foundry`).
- `npm run format` / `npm run lint:fix` — format or auto-fix files with Biome.
- `npm run build:packs` — rebuild the `GM Helpers` and `Player Macros` LevelDB compendiums via `scripts/build-compendiums.mjs` (reads `FOUNDRY_APP_DIR` or `--foundry-dir <path>`, defaulting to `/home/sheas/.local/share/foundryvtt-app`).

## That's it!

This is a very simple system for a very simple (but awesome) game. Enjoy!
