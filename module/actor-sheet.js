const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const itemItemType = "MiscItem";
const propItemType = "Prop";
const spellItemType = "Spell";

/**
 * Character sheet for the Definitely Wizards system using ApplicationV2.
 */
export class DefinitelyWizardsActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["definitelywizards", "sheet", "actor", "theme-light"],
        position: {
            width: 750,
            height: 625,
        },
        window: {
            resizable: false,
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
            addItem: DefinitelyWizardsActorSheet._onAddItem,
            editItem: DefinitelyWizardsActorSheet._onEditItem,
            deleteItem: DefinitelyWizardsActorSheet._onDeleteItem,
            rollItem: DefinitelyWizardsActorSheet._onRollItem,
        },
    };

    static PARTS = {
        form: {
            template: "systems/definitely-wizards/templates/actor-sheet.html",
            scrollable: [".dw-prop-list", ".dw-item-list", ".dw-spell-list"],
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
        const { TextEditor } = foundry.applications.ux;

        context.actor = this.actor;
        context.system = this.actor.system;
        context.source = source;
        context.editable = this.isEditable;
        context.owner = this.actor.isOwner;
        context.config = CONFIG.DEFINITELY_WIZARDS;
        context.tabs = this._prepareTabs("primary");

        context.isWizardHigh = Number(this.actor.system.stats.wizard) >= 6;
        context.isWildHigh = Number(this.actor.system.stats.wild) >= 6;
        context.showCustomClass = this.actor.system.playerClass === "custom";
        context.showClassDescription =
            Boolean(this.actor.system.playerClass) && this.actor.system.playerClass !== "none";
        context.showCustomProp1 = this.actor.system.prop1 === "custom";
        context.showCustomProp2 = this.actor.system.prop2 === "custom";

        context.enrichedBiography = await TextEditor.implementation.enrichHTML(
            this.actor.system.biography ?? "",
            {
                secrets: this.actor.isOwner,
                rollData: () => this.actor.getRollData(),
                relativeTo: this.actor,
            },
        );

        context.enrichedClassDescription = await TextEditor.implementation.enrichHTML(
            this.actor.system.classDescription ?? "",
            {
                secrets: this.actor.isOwner,
                rollData: () => this.actor.getRollData(),
                relativeTo: this.actor,
            },
        );

        this._prepareCharacterItems(context);

        return context;
    }

    /**
     * Partition embedded Items into props, miscItems, and spells.
     * @param {Record<string, any>} context
     */
    _prepareCharacterItems(context) {
        const miscItems = [];
        const props = [];
        const spells = [];

        for (const itemDoc of this.actor.items.contents) {
            const item = itemDoc.toObject(false);
            item.img = item.img || Item.DEFAULT_ICON;

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

    /**
     * Determine whether an action target belongs to the Wizard stat block.
     * @param {HTMLElement} target
     * @returns {boolean}
     */
    static _isWizardTarget(target) {
        return Boolean(target.closest("#stat-wizard"));
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
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onStatRoll(_event, target) {
        const template = "systems/definitely-wizards/templates/chat/skill-roll-chat.hbs";
        const isWizardRoll = DefinitelyWizardsActorSheet._isWizardTarget(target);
        const currentValue = isWizardRoll
            ? Number(this.actor.system.stats.wizard)
            : Number(this.actor.system.stats.wild);

        const formula = target.dataset.roll ?? "1d6";
        const roll = new Roll(formula, this.actor.getRollData());
        await roll.evaluate();

        const isSuccess = roll.total <= currentValue;
        const templateData = {
            isWizardRoll,
            isSuccess,
            diceFormula: roll.formula,
            diceTotal: roll.total,
            owner: this.actor.id,
        };

        if (isSuccess && isWizardRoll) {
            await this.actor.updateStat?.(isWizardRoll, 1);
        }

        const rollMessage = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: await foundry.applications.handlebars.renderTemplate(template, templateData),
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
    static async _onAttributeRoll(_event, target) {
        const formula = target.dataset.roll ?? "1d6";
        const roll = new Roll(formula, this.actor.getRollData());
        await roll.evaluate();

        const parent = target.closest(".attribute");
        if (!parent) return;

        const labelEl = parent.querySelector("label");
        const select = /** @type {HTMLSelectElement | null} */ (parent.querySelector("select"));
        if (!select) return;

        const label = labelEl?.textContent ?? "";
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

        const rollMessage = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: `<div class="definitelywizards chat-card"><h2>${label} Roll</h2><h3>${option.textContent}</h3></div>`,
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
        if (itemType.length > 0) {
            const created = await this.actor.createEmbeddedDocuments("Item", [
                { type: itemType, name: game.i18n.localize("DW.NewItemName") },
            ]);
            await created[0]?.sheet.render(true);
        }
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
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async _onRollItem(_event, target) {
        const row = /** @type {HTMLElement | null} */ (target.closest("[data-item-id]"));
        const itemID = row?.dataset.itemId;
        if (!itemID) return;
        const item = this.actor.items.get(itemID);
        if (!item) return;

        const messageData = {
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: `
                <div class="definitelywizards chat-card">
                    <div class="chatItem flexrow">
                        <div class="item-image" tabindex="0" aria-label="${item.name}" style="background-image: url('${item.img}')"></div>
                        <h4>${item.name}</h4>
                    </div>
                    <div>${item.system.description ?? ""}</div>
                </div>`,
        };

        await ChatMessage.create(messageData);
    }
}
