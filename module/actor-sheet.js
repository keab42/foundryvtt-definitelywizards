import { DEFAULT_WIZARD_SPELL_NAMES } from "./data-models.js";
import * as Dice from "./dice.js";
import { STAT_MACRO_TYPE } from "./macros.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const itemItemType = "MiscItem";
const propItemType = "Prop";
const spellItemType = "Spell";

/**
 * Resolve description and inventory status for a starting prop slot (`prop1` or `prop2`).
 * @param {Actor} actor
 * @param {"prop1" | "prop2"} slot
 * @returns {{ description: string, inInventory: boolean, canAdd: boolean }}
 */
function getStartingPropStatus(actor, slot) {
    const propGroup = slot === "prop1" ? "props1" : "props2";
    const customField = slot === "prop1" ? "customProp1" : "customProp2";
    const key = actor.system[slot];

    if (!key || key === "none") {
        return { description: "", inInventory: false, canAdd: false };
    }

    if (key === "custom") {
        const customName = String(actor.system[customField] ?? "").trim();
        const normalized = customName.toLowerCase();
        const inInventory =
            Boolean(normalized) &&
            actor.items.some(
                (item) =>
                    item.type === propItemType && item.name.trim().toLowerCase() === normalized,
            );
        return { description: "", inInventory, canAdd: Boolean(normalized) };
    }

    const configEntry = CONFIG.DEFINITELY_WIZARDS?.[propGroup]?.[key];
    const targetName = (configEntry?.itemName || configEntry?.label || key).trim().toLowerCase();
    const description = configEntry?.description ? game.i18n.localize(configEntry.description) : "";
    const inInventory = actor.items.some(
        (item) => item.type === propItemType && item.name.trim().toLowerCase() === targetName,
    );
    return { description, inInventory, canAdd: true };
}

/**
 * Resolve the d6 or Wit Bonus roll formula from an element dataset or Shift modifier.
 * @param {PointerEvent | undefined} event
 * @param {HTMLElement} target
 * @returns {"1d6" | "2d6kl"}
 */
function resolveRollFormula(event, target) {
    if (target.dataset.roll === "2d6kl" || event?.shiftKey) {
        return "2d6kl";
    }
    return "1d6";
}

/**
 * Character sheet for the Definitely Wizards system using ApplicationV2.
 */
export class DefinitelyWizardsActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["definitelywizards", "sheet", "actor", "theme-light"],
        position: {
            width: 860,
            height: 625,
        },
        window: {
            resizable: true,
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            statPlus: DefinitelyWizardsActorSheet._onStatPlus,
            statMinus: DefinitelyWizardsActorSheet._onStatMinus,
            statReset: DefinitelyWizardsActorSheet._onStatReset,
            statRoll: DefinitelyWizardsActorSheet._onStatRoll,
            attributeRoll: DefinitelyWizardsActorSheet._onAttributeRoll,
            addStartingProp: DefinitelyWizardsActorSheet._onAddStartingProp,
            addDefaultSpells: DefinitelyWizardsActorSheet._onAddDefaultSpells,
            propCostuming: DefinitelyWizardsActorSheet._onPropCostuming,
            castSpell: DefinitelyWizardsActorSheet._onCastSpell,
            castWildSpell: DefinitelyWizardsActorSheet._onCastWildSpell,
            addItem: DefinitelyWizardsActorSheet._onAddItem,
            editItem: DefinitelyWizardsActorSheet._onEditItem,
            deleteItem: DefinitelyWizardsActorSheet._onDeleteItem,
            rollItem: DefinitelyWizardsActorSheet._onRollItem,
        },
    };

    static PARTS = {
        form: {
            template: "systems/definitely-wizards/templates/actor-sheet.html",
            scrollable: [".sheet-body", ".dw-prop-list", ".dw-item-list", ".dw-spells-scroll"],
        },
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "attributes", label: "DW.AttributesTitle" },
                { id: "bio", label: "DW.BiographyTitle" },
                { id: "items", label: "DW.ItemsTitle" },
                { id: "spells", label: "DW.SpellsTitle" },
            ],
            initial: "attributes",
        },
    };

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const source = this.actor.toObject();

        context.actor = this.actor;
        context.system = this.actor.system;
        context.source = source;
        context.editable = this.isEditable;
        context.owner = this.actor.isOwner;
        context.config = CONFIG.DEFINITELY_WIZARDS;
        context.tabs = this._prepareTabs("primary");

        const wizardVal = Number(this.actor.system.stats.wizard);
        const wildVal = Number(this.actor.system.stats.wild);
        context.isWizardHigh = wizardVal >= 6;
        context.isWildHigh = wildVal >= 6;
        context.isWildArrested = wildVal >= 7;
        if (wildVal >= 7) {
            const arrestedMsg = game.i18n.localize("DW.AlreadyArrestedWarning");
            context.wizardRollTooltip = arrestedMsg;
            context.wizardWitRollTooltip = arrestedMsg;
            context.wildRollTooltip = arrestedMsg;
            context.wildWitRollTooltip = arrestedMsg;
        } else if (wizardVal >= 6 && wildVal >= 6) {
            const bothLockedMsg = game.i18n.localize("DW.BothStatsLockedWarning");
            context.wizardRollTooltip = bothLockedMsg;
            context.wizardWitRollTooltip = bothLockedMsg;
            context.wildRollTooltip = bothLockedMsg;
            context.wildWitRollTooltip = bothLockedMsg;
        } else {
            context.wizardRollTooltip = context.isWizardHigh
                ? game.i18n.localize("DW.WizardLockedWarning")
                : game.i18n.localize("DW.WizardRollTooltip");
            context.wizardWitRollTooltip = context.isWizardHigh
                ? game.i18n.localize("DW.WizardLockedWarning")
                : game.i18n.localize("DW.WizardRollWithWitTooltip");
            context.wildRollTooltip = context.isWildHigh
                ? game.i18n.localize("DW.WildLockedWarning")
                : game.i18n.localize("DW.WildRollTooltip");
            context.wildWitRollTooltip = context.isWildHigh
                ? game.i18n.localize("DW.WildLockedWarning")
                : game.i18n.localize("DW.WildRollWithWitTooltip");
        }
        context.showCustomClass = this.actor.system.playerClass === "custom";
        context.showClassDescription =
            Boolean(this.actor.system.playerClass) && this.actor.system.playerClass !== "none";
        context.showCustomProp1 = this.actor.system.prop1 === "custom";
        context.showCustomProp2 = this.actor.system.prop2 === "custom";

        const prop1Status = getStartingPropStatus(this.actor, "prop1");
        const prop2Status = getStartingPropStatus(this.actor, "prop2");
        context.prop1Description = prop1Status.description;
        context.prop1InInventory = prop1Status.inInventory;
        context.canAddProp1 = prop1Status.canAdd;
        context.prop2Description = prop2Status.description;
        context.prop2InInventory = prop2Status.inInventory;
        context.canAddProp2 = prop2Status.canAdd;

        const ownedSpellNames = new Set(
            this.actor.items
                .filter((item) => item.type === spellItemType)
                .map((item) => item.name.trim().toLowerCase()),
        );
        context.hasMissingDefaultSpells = DEFAULT_WIZARD_SPELL_NAMES.some(
            (name) => !ownedSpellNames.has(name),
        );

        context.enrichedBiography = await Dice.enrichHtml(this.actor.system.biography, {
            document: this.actor,
            secrets: this.actor.isOwner,
        });

        context.enrichedClassDescription = await Dice.enrichHtml(
            this.actor.system.classDescription,
            {
                document: this.actor,
                secrets: this.actor.isOwner,
            },
        );

        await this._prepareCharacterItems(context);

        return context;
    }

    /**
     * Partition embedded Items into props, miscItems, and spells with enriched descriptions.
     * @param {Record<string, any>} context
     */
    async _prepareCharacterItems(context) {
        const miscItems = [];
        const props = [];
        const spells = [];

        const preparedItems = await Promise.all(
            this.actor.items.contents.map(async (itemDoc) => {
                const item = itemDoc.toObject(false);
                item.img = item.img || Item.DEFAULT_ICON;
                item.enrichedDescription = await Dice.enrichHtml(item.system?.description, {
                    document: itemDoc,
                    secrets: itemDoc.isOwner,
                });
                return item;
            }),
        );

        for (const item of preparedItems) {
            if (item.type === itemItemType) {
                miscItems.push(item);
            } else if (item.type === propItemType) {
                props.push(item);
            } else if (item.type === spellItemType) {
                spells.push(item);
            }
        }

        context.miscItems = miscItems;
        context.props = props;
        context.spells = spells;
    }

    /** @override */
    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = super._prepareSubmitData(event, form, formData, updateData);
        const newClass = submitData?.system?.playerClass;
        if (newClass !== undefined && newClass !== this.actor.system.playerClass) {
            const classDescKey = CONFIG.DEFINITELY_WIZARDS?.playerClasses?.[newClass]?.description;
            submitData.system.classDescription = classDescKey
                ? game.i18n.localize(classDescKey)
                : "";
        }
        return submitData;
    }

    /** @override */
    async _onDragStart(event) {
        const target = /** @type {HTMLElement | null} */ (event.currentTarget);
        const stat = target?.dataset.stat;
        const formula = target?.dataset.roll;
        if (stat && formula && event.dataTransfer) {
            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                    type: STAT_MACRO_TYPE,
                    isWizardRoll: stat === "wizard",
                    formula,
                }),
            );
            return;
        }
        return super._onDragStart(event);
    }

    /**
     * Determine whether an action target belongs to the Wizard stat block.
     * @param {HTMLElement} target
     * @returns {boolean}
     */
    static _isWizardTarget(target) {
        return Boolean(target.closest(".dw-stat-wizard"));
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onStatPlus(_event, target) {
        const isWizardRoll = DefinitelyWizardsActorSheet._isWizardTarget(target);
        await this.actor.updateStat?.(isWizardRoll, 1);
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onStatMinus(_event, target) {
        const isWizardRoll = DefinitelyWizardsActorSheet._isWizardTarget(target);
        await this.actor.updateStat?.(isWizardRoll, -1);
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onStatReset(_event, target) {
        const isWizardRoll = DefinitelyWizardsActorSheet._isWizardTarget(target);
        await this.actor.resetStat?.(isWizardRoll);
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async _onStatRoll(event, target) {
        const isWizardRoll = DefinitelyWizardsActorSheet._isWizardTarget(target);
        const formula = resolveRollFormula(event, target);
        await Dice.rollSkill(this.actor, { isWizardRoll, formula });
    }

    /**
     * Add Prop 1 or Prop 2 from Attributes into the actor's Props inventory.
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onAddStartingProp(_event, target) {
        const slot = target.dataset.propSlot === "prop2" ? "prop2" : "prop1";
        await this.actor.addStartingProp?.(slot);
    }

    /**
     * Populate any missing standard low-grade Wizard spells on the actor.
     * @this {DefinitelyWizardsActorSheet}
     */
    static async _onAddDefaultSpells() {
        await this.actor.populateDefaultSpells?.({ notify: true });
    }

    /**
     * Apply Costuming (+1 Wizard or -1 Wild) directly from a Prop row on the sheet.
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onPropCostuming(_event, target) {
        const row = /** @type {HTMLElement | null} */ (target.closest("[data-item-id]"));
        const itemId = row?.dataset.itemId;
        const item = itemId ? this.actor.items.get(itemId) : null;
        if (!item) return;

        const isWizard = target.dataset.stat === "wizard";
        await this.actor.applyCostuming?.(isWizard, item.name);
    }

    /**
     * Cast a Wizard spell directly from the Spells tab (1d6 or 2d6kl Wit Bonus).
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async _onCastSpell(event, target) {
        const row = /** @type {HTMLElement | null} */ (target.closest("[data-item-id]"));
        const itemId = row?.dataset.itemId;
        const spell = itemId ? this.actor.items.get(itemId) : null;
        if (!spell) return;

        const formula = resolveRollFormula(event, target);
        await Dice.rollSkill(this.actor, { isWizardRoll: true, formula, spell });
    }

    /**
     * Cast an improvised Wild spell from the Spells tab (1d6 or 2d6kl Wit Bonus).
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async _onCastWildSpell(event, target) {
        const noteInput = /** @type {HTMLInputElement | null} */ (
            this.element?.querySelector(".dw-wild-spell-note")
        );
        const customSpellName = noteInput?.value?.trim() || game.i18n.localize("DW.WildSpellLabel");
        const formula = resolveRollFormula(event, target);
        await Dice.rollSkill(this.actor, {
            isWizardRoll: false,
            formula,
            customSpellName,
        });
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onAttributeRoll(_event, target) {
        const formula = target.dataset.roll ?? "1d6";
        const roll = new Roll(formula, this.actor.getRollData());
        await roll.evaluate();

        const parent = target.closest(".attribute");
        if (!parent) return;

        const labelEl = parent.querySelector("label");
        const select = /** @type {HTMLSelectElement | null} */ (parent.querySelector("select"));
        if (!select) return;

        const rawLabel = labelEl?.textContent?.trim() ?? "";
        const label = rawLabel || game.i18n.localize("DW.AttributeRollDefaultLabel");
        const attributeName = select.name;
        const option = select.options[roll.total];
        if (!option) return;

        /** @type {Record<string, any>} */
        const updateData = { [attributeName]: option.value };
        if (attributeName === "system.playerClass") {
            const classDescKey =
                CONFIG.DEFINITELY_WIZARDS?.playerClasses?.[option.value]?.description;
            updateData["system.classDescription"] = classDescKey
                ? game.i18n.localize(classDescKey)
                : "";
        }

        await this.actor.update(updateData);

        const safeTitle = foundry.utils.escapeHTML(
            game.i18n.format("DW.AttributeRollTitle", { label }),
        );
        const safeOption = foundry.utils.escapeHTML(option.textContent ?? "");

        const rollMessage = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: `<div class="definitelywizards chat-card"><h2>${safeTitle}</h2><h3>${safeOption}</h3></div>`,
            rolls: [roll],
            sound: CONFIG.sounds.dice,
        };

        await ChatMessage.create(rollMessage);
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onAddItem(_event, target) {
        const itemType = target.dataset.itemType ?? "";
        if (itemType.length === 0) return;

        const defaultNameKey =
            itemType === propItemType
                ? "DW.NewPropName"
                : itemType === spellItemType
                  ? "DW.NewSpellName"
                  : "DW.NewItemName";

        const created = await this.actor.createEmbeddedDocuments("Item", [
            {
                type: itemType,
                name: game.i18n.localize(defaultNameKey),
            },
        ]);
        await created[0]?.sheet.render(true);
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onEditItem(_event, target) {
        const row = /** @type {HTMLElement | null} */ (target.closest("[data-item-id]"));
        const itemID = row?.dataset.itemId;
        if (!itemID) return;
        const item = this.actor.items.get(itemID);
        if (item) {
            await item.sheet.render(true);
        }
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onDeleteItem(_event, target) {
        const row = /** @type {HTMLElement | null} */ (target.closest("[data-item-id]"));
        const itemID = row?.dataset.itemId;
        if (!itemID) return;
        const item = this.actor.items.get(itemID);
        if (!item) return;

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: `${game.i18n.localize("DW.ConfirmItemDelete")}: ${item.name}`,
            },
            content: `<p>${game.i18n.localize("DW.ConfirmItemDeleteText")}</p>`,
            rejectClose: false,
            modal: true,
        });

        if (confirmed) {
            await item.delete();
        }
    }

    /**
     * @this {DefinitelyWizardsActorSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async _onRollItem(event, target) {
        const row = /** @type {HTMLElement | null} */ (target.closest("[data-item-id]"));
        const itemID = row?.dataset.itemId;
        if (!itemID) return;
        const item = this.actor.items.get(itemID);
        if (!item) return;

        if (item.type === spellItemType && event?.shiftKey) {
            await Dice.rollSkill(this.actor, { isWizardRoll: true, formula: "2d6kl", spell: item });
            return;
        }

        await Dice.postItemCard(this.actor, item);
    }
}
