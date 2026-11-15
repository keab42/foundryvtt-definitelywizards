import { DEFAULT_WIZARD_SPELLS } from "./data-models.js";

const PROP_DEFAULT_ICON = "systems/definitely-wizards/resources/icons/wizard-hat.svg";
const SPELL_DEFAULT_ICON = "systems/definitely-wizards/resources/icons/magic-wand.svg";

/**
 * Extend the base Actor document for the Definitely Wizards system.
 */
export class DefinitelyWizardsActor extends Actor {
    /**
     * Populate the 10 standard low-grade Wizard spells for newly created characters.
     * @override
     * @param {Record<string, any>} data
     * @param {Record<string, any>} options
     * @param {string} userId
     */
    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);

        if (
            userId === game.user.id &&
            this.type === "character" &&
            !options.fromCompendium &&
            !data.items?.length &&
            this.items.size === 0
        ) {
            void this.populateDefaultSpells({ notify: false });
        }
    }

    /**
     * Add any missing low-grade Wizard spells from the compendium (or fallback list).
     * @param {object} [options]
     * @param {boolean} [options.notify=true]
     * @returns {Promise<Item[]>}
     */
    async populateDefaultSpells({ notify = true } = {}) {
        const existingNames = new Set(
            this.items
                .filter((item) => item.type === "Spell")
                .map((item) => item.name.trim().toLowerCase()),
        );

        const missingEntries = DEFAULT_WIZARD_SPELLS.filter(
            (entry) => !existingNames.has(entry.name.trim().toLowerCase()),
        );

        if (missingEntries.length === 0) {
            if (notify) {
                ui.notifications.info(game.i18n.localize("DW.NoMissingDefaultSpells"));
            }
            return [];
        }

        const pack = game.packs?.get("definitely-wizards.spells");
        const packDocs = pack ? await pack.getDocuments() : [];
        const packByName = new Map(packDocs.map((doc) => [doc.name.trim().toLowerCase(), doc]));

        const missing = missingEntries.map((entry) => {
            const match = packByName.get(entry.name.trim().toLowerCase());
            if (match) {
                const obj = match.toObject();
                delete obj._id;
                obj.type = "Spell";
                obj.img = obj.img || SPELL_DEFAULT_ICON;
                if (obj.system && "spellType" in obj.system) {
                    delete obj.system.spellType;
                }
                return obj;
            }
            return {
                name: entry.name,
                type: "Spell",
                img: SPELL_DEFAULT_ICON,
                system: {
                    description: entry.description,
                    quantity: 1,
                    weight: 0,
                },
            };
        });

        const created = await this.createEmbeddedDocuments("Item", missing);
        if (notify) {
            ui.notifications.info(
                game.i18n.format("DW.DefaultSpellsAdded", { count: created.length }),
            );
        }
        return created;
    }

    /**
     * Add the configured starting prop (Prop 1 or Prop 2) into the actor's Props list.
     * @param {"prop1" | "prop2"} slot
     * @returns {Promise<Item | null>}
     */
    async addStartingProp(slot) {
        const propGroup = slot === "prop1" ? "props1" : "props2";
        const customField = slot === "prop1" ? "customProp1" : "customProp2";
        const key = this.system[slot];

        if (!key || key === "none") {
            ui.notifications.warn(game.i18n.localize("DW.SelectPropFirst"));
            return null;
        }

        if (key === "custom") {
            const customName = String(this.system[customField] ?? "").trim();
            if (!customName) {
                ui.notifications.warn(game.i18n.localize("DW.SelectPropFirst"));
                return null;
            }

            const created = await this.createEmbeddedDocuments("Item", [
                {
                    name: customName,
                    type: "Prop",
                    img: PROP_DEFAULT_ICON,
                    system: { description: "", quantity: 1, weight: 0 },
                },
            ]);
            return created[0] ?? null;
        }

        const configEntry = CONFIG.DEFINITELY_WIZARDS?.[propGroup]?.[key];
        const targetName = configEntry?.itemName || configEntry?.label || key;
        const normalizedTarget = targetName.trim().toLowerCase();

        const pack = game.packs?.get("definitely-wizards.props");
        const packDocs = pack ? await pack.getDocuments() : [];
        const match = packDocs.find((doc) => doc.name.trim().toLowerCase() === normalizedTarget);

        /** @type {Record<string, any>} */
        let propData;
        if (match) {
            propData = match.toObject();
            delete propData._id;
            propData.type = "Prop";
            propData.img = propData.img || PROP_DEFAULT_ICON;
            if (propData.system && "spellType" in propData.system) {
                delete propData.system.spellType;
            }
        } else {
            const desc = configEntry?.description
                ? `<p>${game.i18n.localize(configEntry.description)}</p>`
                : "";
            propData = {
                name: targetName,
                type: "Prop",
                img: PROP_DEFAULT_ICON,
                system: { description: desc, quantity: 1, weight: 0 },
            };
        }

        const created = await this.createEmbeddedDocuments("Item", [propData]);
        return created[0] ?? null;
    }

    /**
     * Adjust either the Wizard or Wild stat by an offset, enforcing rules and loss conditions.
     * @param {boolean} isWizard
     * @param {number} offset
     * @param {object} [options]
     * @param {boolean} [options.suppressBothLockedAlert=false]
     * @param {boolean} [options.silent=false]
     * @param {string[] | null} [options.createdMessageIds=null]
     * @returns {Promise<boolean>}
     */
    async updateStat(
        isWizard,
        offset,
        { suppressBothLockedAlert = false, silent = false, createdMessageIds = null } = {},
    ) {
        const oldValue = Number(isWizard ? this.system.stats.wizard : this.system.stats.wild);
        const max = isWizard ? 6 : 7;
        const newValue = Math.min(max, Math.max(0, oldValue + offset));

        if (newValue === oldValue) {
            return false;
        }

        const otherStat = Number(isWizard ? this.system.stats.wild : this.system.stats.wizard);
        const fieldPath = isWizard ? "system.stats.wizard" : "system.stats.wild";
        await this.update({ [fieldPath]: newValue });
        if (silent) return true;

        /** @param {ChatMessage | undefined} msg */
        const recordMsg = (msg) => {
            if (msg?.id && createdMessageIds) {
                createdMessageIds.push(msg.id);
            }
        };

        recordMsg(await this._postUpdateToChat(isWizard, oldValue, newValue));

        if (!isWizard && newValue >= 7) {
            recordMsg(await this._postAlertToChat("DW.EndGame"));
        } else if (oldValue < 6 && newValue === 6) {
            if (otherStat === 6 && !suppressBothLockedAlert) {
                recordMsg(await this._postAlertToChat("DW.BothStatsReachedSix"));
            } else if (isWizard) {
                recordMsg(await this._postAlertToChat("DW.WizardReachedSix"));
            } else {
                recordMsg(await this._postAlertToChat("DW.WildReachedSix"));
            }
            if (!isWizard) {
                recordMsg(await this._checkPartyWildArrest());
            }
        }

        return true;
    }

    /**
     * Reset either the Wizard or Wild stat back to 2.
     * @param {boolean} isWizard
     */
    async resetStat(isWizard) {
        const oldValue = Number(isWizard ? this.system.stats.wizard : this.system.stats.wild);
        const fieldPath = isWizard ? "system.stats.wizard" : "system.stats.wild";

        await this.update({ [fieldPath]: 2 });
        await this._postUpdateToChat(isWizard, oldValue, 2);
    }

    /**
     * Apply Costuming from utilizing a Prop (+1 Wizard or -1 Wild).
     * @param {boolean} isWizard
     * @param {string} propName
     * @returns {Promise<boolean>}
     */
    async applyCostuming(isWizard, propName) {
        const currentWizard = Number(this.system.stats.wizard);
        const currentWild = Number(this.system.stats.wild);

        if (currentWild >= 7) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyArrestedWarning"));
            return false;
        }
        if (isWizard && currentWizard >= 6) {
            ui.notifications.warn(game.i18n.localize("DW.CostumingWizardAlreadyMax"));
            return false;
        }
        if (!isWizard && currentWild <= 0) {
            ui.notifications.warn(game.i18n.localize("DW.CostumingWildAlreadyMin"));
            return false;
        }

        const changed = await this.updateStat(isWizard, isWizard ? 1 : -1);
        if (!changed) return false;

        const key = isWizard ? "DW.CostumingMessageWizard" : "DW.CostumingMessageWild";
        const safeActor = foundry.utils.escapeHTML(this.name);
        const safeProp = foundry.utils.escapeHTML(propName);

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<div class="definitelywizards chat-card"><p>${game.i18n.format(key, {
                actor: safeActor,
                prop: safeProp,
            })}</p></div>`,
        });

        return true;
    }

    /**
     * Check whether the entire party has reached Wild = 6 simultaneously.
     */
    async _checkPartyWildArrest() {
        const assignedByUuid = new Map();
        for (const user of game.users.filter((u) => !u.isGM && Boolean(u.character))) {
            const char = user.character;
            if (char?.type === "character") {
                assignedByUuid.set(char.uuid, char);
            }
        }

        const tokenCollection =
            (this.isToken ? this.parent?.parent?.tokens : null) ??
            (canvas?.tokens?.placeables?.length
                ? canvas.tokens.placeables
                : (game.scenes?.active?.tokens ?? game.scenes?.current?.tokens ?? []));
        const sceneByUuid = new Map();
        for (const token of tokenCollection) {
            const tokenActor = token?.actor;
            if (tokenActor?.type === "character" && tokenActor.hasPlayerOwner) {
                sceneByUuid.set(tokenActor.uuid, tokenActor);
            }
        }

        const assignedParty = Array.from(assignedByUuid.values());
        const sceneParty = Array.from(sceneByUuid.values());
        const playerOwned = game.actors.filter((a) => a.type === "character" && a.hasPlayerOwner);
        const allCharacters = game.actors.filter((a) => a.type === "character");

        /** @type {Actor[]} */
        let party = [];
        if (
            assignedParty.length >= 2 &&
            assignedByUuid.has(this.uuid) &&
            !sceneParty.some((actor) => actor.isToken)
        ) {
            party = assignedParty;
        } else if (sceneParty.length >= 2 && sceneByUuid.has(this.uuid)) {
            party = sceneParty;
        } else if (assignedParty.length >= 2) {
            party = assignedParty;
        } else if (sceneParty.length >= 2) {
            party = sceneParty;
        } else if (playerOwned.length >= 2) {
            party = playerOwned;
        } else if (
            assignedParty.length === 0 &&
            sceneParty.length === 0 &&
            playerOwned.length === 0 &&
            allCharacters.length >= 2
        ) {
            party = allCharacters;
        }

        if (
            party.length >= 2 &&
            party.some((actor) => actor.uuid === this.uuid) &&
            party.every((actor) => Number(actor.system?.stats?.wild) >= 6)
        ) {
            return this._postAlertToChat("DW.PartyEndGame");
        }
        return undefined;
    }

    /**
     * Post a styled rule alert card to chat.
     * @param {string} localizationKey
     * @returns {Promise<ChatMessage | undefined>}
     */
    async _postAlertToChat(localizationKey) {
        return ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<div class="definitelywizards chat-card"><p><strong>${game.i18n.localize(localizationKey)}</strong></p></div>`,
        });
    }

    /**
     * Post a stat change card to the chat log.
     * @param {boolean} isWizard
     * @param {number} oldValue
     * @param {number} newValue
     * @returns {Promise<ChatMessage | undefined>}
     */
    async _postUpdateToChat(isWizard, oldValue, newValue) {
        const template = "systems/definitely-wizards/templates/chat/actor-stat-update-chat.hbs";
        const templateData = {
            isWizardRoll: isWizard,
            oldValue,
            newValue,
            owner: this.id,
        };

        return ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: await foundry.applications.handlebars.renderTemplate(template, templateData),
            style: CONST.CHAT_MESSAGE_STYLES.OOC,
        });
    }
}
