import { DefinitelyWizardsActor } from "./actor.js";
import { DefinitelyWizardsActorSheet } from "./actor-sheet.js";
import * as Chat from "./chat.js";
import {
    CharacterDataModel,
    DEFINITELY_WIZARDS,
    DefinitelyWizardsItemDataModel,
} from "./data-models.js";
import { generatePracticalExam } from "./exam-generator.js";
import { DefinitelyWizardsItem } from "./item.js";
import { DefinitelyWizardsItemSheet } from "./item-sheet.js";

Hooks.once("init", async () => {
    console.log("DefinitelyWizards: Initializing");

    CONFIG.DEFINITELY_WIZARDS = DEFINITELY_WIZARDS;
    CONFIG.Actor.documentClass = DefinitelyWizardsActor;
    CONFIG.Item.documentClass = DefinitelyWizardsItem;
    CONFIG.Actor.dataModels.character = CharacterDataModel;
    CONFIG.Item.dataModels.Prop = DefinitelyWizardsItemDataModel;
    CONFIG.Item.dataModels.Spell = DefinitelyWizardsItemDataModel;
    CONFIG.Item.dataModels.MiscItem = DefinitelyWizardsItemDataModel;

    game.definitelyWizards = {
        generatePracticalExam,
    };

    const { DocumentSheetConfig } = foundry.applications.apps;
    DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
    DocumentSheetConfig.registerSheet(Actor, "definitely-wizards", DefinitelyWizardsActorSheet, {
        label: "Definitely Wizards Character Sheet (Default)",
        makeDefault: true,
    });

    DocumentSheetConfig.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);
    DocumentSheetConfig.registerSheet(Item, "definitely-wizards", DefinitelyWizardsItemSheet, {
        label: "Definitely Wizards Item Sheet (Default)",
        makeDefault: true,
    });
});

Hooks.once("ready", async () => {
    if (!game.users.activeGM?.isSelf) return;

    const existingRollTables = new Set(game.tables.contents.map((doc) => doc.name));
    const rollTablesToAdd = [];
    const rollTables = {
        Judge: "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-judge.json",
        RoomType: "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-room-type.json",
        MainObstacle:
            "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-main-obstacle.json",
        AddedChallenge:
            "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-added-challenge.json",
        Surprise: "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-surprise.json",
        FinalTest:
            "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-final-test.json",
        MonsterFactoryCreature:
            "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-monster-factory-creature.json",
        MonsterFactoryTrait:
            "systems/definitely-wizards/resources/roll-tables/fvtt-RollTable-monster-factory-trait.json",
    };

    for (const [name, url] of Object.entries(rollTables)) {
        if (!existingRollTables.has(name)) {
            const rollTable = await foundry.utils.fetchJsonWithTimeout(url);
            rollTablesToAdd.push(rollTable);
        }
    }

    if (rollTablesToAdd.length > 0) {
        await RollTable.createDocuments(rollTablesToAdd);
    }
});

Hooks.on("renderChatMessageHTML", (message, html) => Chat.addChatListeners(message, html));
Hooks.on("createChatMessage", (message) => Chat.onCreateChatMessage(message));
Hooks.on("deleteChatMessage", (message) => Chat.onDeleteChatMessage(message));
