import { enrichHtml } from "./dice.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Item sheet for the Definitely Wizards system using ApplicationV2.
 */
export class DefinitelyWizardsItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["definitelywizards", "sheet", "item", "theme-light"],
        position: {
            width: 550,
            height: 400,
        },
        window: {
            resizable: true,
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false,
        },
    };

    static PARTS = {
        form: {
            template: "systems/definitely-wizards/templates/item-sheet.html",
        },
    };

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const source = this.item.toObject();

        context.item = this.item;
        context.system = this.item.system;
        context.source = source;
        context.editable = this.isEditable;
        context.owner = this.item.isOwner;
        context.enrichedDescription = await enrichHtml(this.item.system.description, {
            document: this.item,
            secrets: this.item.isOwner,
        });

        return context;
    }
}
