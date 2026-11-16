const DEFAULT_ARTWORK_BY_TYPE = {
    Prop: "systems/definitely-wizards/resources/icons/wizard-hat.svg",
    Spell: "systems/definitely-wizards/resources/icons/magic-wand.svg",
    MiscItem: "systems/definitely-wizards/resources/icons/misc-item.svg",
};

/**
 * Extend the base Item document for the Definitely Wizards system.
 */
export class DefinitelyWizardsItem extends Item {
    /**
     * Provide type-appropriate default artwork for Props and Spells.
     * @override
     * @param {Record<string, any>} itemData
     * @returns {{ img: string }}
     */
    static getDefaultArtwork(itemData) {
        const icon = DEFAULT_ARTWORK_BY_TYPE[itemData?.type];
        if (icon) {
            return { img: icon };
        }
        return super.getDefaultArtwork(itemData);
    }
}
