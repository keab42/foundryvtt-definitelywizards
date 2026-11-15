// Runs during `init` before `game.i18n` translations load, so keep in sync with `DW.DefaultBio`.
const DEFAULT_BIO =
    "<p><em>Come up with your party's backstory together and decide if you know each other's secret.</em></p>";

/**
 * Canonical list of the 10 low-grade Wizard spells every starting character receives.
 * @type {readonly { name: string, description: string }[]}
 */
export const DEFAULT_WIZARD_SPELLS = Object.freeze([
    {
        name: "Acid",
        description:
            "<p>You produce a small stream of weak acid. Put it over some baking soda for a winning science fair project.</p>",
    },
    {
        name: "Frost-nip",
        description: "<p>You shoot a beam of cold air at your enemies, making them chilly.</p>",
    },
    {
        name: "Harm",
        description:
            "<p>You hurl a tiny ball of magical force, like throwing a pop-it firework.</p>",
    },
    {
        name: "Hunch",
        description:
            "<p>You sorta get a sense for what someone else is thinking, or get a hint at what to do next.</p>",
    },
    {
        name: "Shield",
        description: "<p>You create a small force field, although it shatters after one hit.</p>",
    },
    {
        name: "Simple Illusion",
        description: "<p>Make a thing look like something else, if you squint.</p>",
    },
    {
        name: "Singe",
        description: "<p>You produce a small flame, like a built-in lighter.</p>",
    },
    {
        name: "Slime",
        description: "<p>You conjure a ball of goop. Gross!</p>",
    },
    {
        name: "Slowish Fall",
        description: "<p>Maybe now you won't break your legs.</p>",
    },
    {
        name: "Transmogrify",
        description:
            "<p>Turn a small amount of non-magical material into a slightly different one.</p>",
    },
]);

/**
 * Normalized lowercase names of the 10 starting low-grade Wizard spells.
 * @type {readonly string[]}
 */
export const DEFAULT_WIZARD_SPELL_NAMES = Object.freeze(
    DEFAULT_WIZARD_SPELLS.map((spell) => spell.name.trim().toLowerCase()),
);

export const DEFINITELY_WIZARDS = {
    playerClasses: {
        none: {
            label: "Roll",
            description: "",
        },
        "2d6-familiars": {
            label: "2d6 Familiars in a Trenchcoat",
            description: "DW.FamiliarsDescription",
        },
        alchemist: {
            label: "Alchemist",
            description: "DW.AlchemistDescription",
        },
        bard: {
            label: "Bard",
            description: "DW.BardDescription",
        },
        "chosen-one": {
            label: "Chosen One",
            description: "DW.ChosenOneDescription",
        },
        collector: {
            label: "Collector",
            description: "DW.CollectorDescription",
        },
        druid: {
            label: "Druid",
            description: "DW.DruidDescription",
        },
        "elemental-blood": {
            label: "Elemental Blood",
            description: "DW.ElementalBloodDescription",
        },
        magician: {
            label: "Magician",
            description: "DW.MagicianDescription",
        },
        "muscle-magic": {
            label: "Muscle Magic",
            description: "DW.MuscleMagicDescription",
        },
        vampire: {
            label: "Vampire",
            description: "DW.VampireDescription",
        },
        custom: {
            label: "Custom Class",
            description: "DW.CustomClassDescription",
        },
    },
    props1: {
        none: {
            label: "Roll",
            description: "",
        },
        hat: {
            label: "A Pointy Hat and Robes",
            itemName: "A Pointy Hat and Robes",
            description: "DW.PropHatDescription",
        },
        beard: {
            label: "A Long Fake Beard",
            itemName: "A Long Fake Beard",
            description: "DW.PropBeardDescription",
        },
        tome: {
            label: "A Massive Tome",
            itemName: "A Massive Tome",
            description: "DW.PropTomeDescription",
        },
        "fake-wand": {
            label: "A Fake Wand",
            itemName: "A Fake Wand",
            description: "DW.PropFakeWandDescription",
        },
        familar: {
            label: "A Familiar",
            itemName: "A Familiar",
            description: "DW.PropFamiliarDescription",
        },
        custom: {
            label: "Create your own item",
            description: "",
        },
    },
    props2: {
        none: {
            label: "Roll",
            description: "",
        },
        glitter: {
            label: "A Pocket Full of Glitter",
            itemName: "A Pocket Full of Glitter",
            description: "DW.PropGlitterDescription",
        },
        belt: {
            label: "A Belt with lots of Pouches",
            itemName: "A Belt with Lots of Pouches",
            description: "DW.PropBeltDescription",
        },
        glasses: {
            label: "A Pair of Spectacles",
            itemName: "A Pair of Spectacles",
            description: "DW.PropGlassesDescription",
        },
        amulet: {
            label: "A Costume-quality Amulet",
            itemName: "A Costume-quality Amulet",
            description: "DW.PropAmuletDescription",
        },
        quill: {
            label: "A Quill and Parchment",
            itemName: "A Quill and Parchment",
            description: "DW.PropQuillDescription",
        },
        custom: {
            label: "Create your own item",
            description: "",
        },
    },
};

export class CharacterDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const { HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;
        return {
            biography: new HTMLField({
                required: false,
                blank: true,
                initial: DEFAULT_BIO,
            }),
            classDescription: new HTMLField({
                required: false,
                blank: true,
                initial: "<p></p>",
            }),
            stats: new SchemaField({
                wizard: new NumberField({
                    required: true,
                    integer: true,
                    initial: 3,
                    min: 0,
                    max: 6,
                }),
                wild: new NumberField({
                    required: true,
                    integer: true,
                    initial: 3,
                    min: 0,
                    max: 7,
                }),
            }),
            playerClass: new StringField({
                required: true,
                blank: true,
                initial: "none",
            }),
            prop1: new StringField({
                required: true,
                blank: true,
                initial: "none",
            }),
            prop2: new StringField({
                required: true,
                blank: true,
                initial: "none",
            }),
            customClass: new StringField({
                required: false,
                blank: true,
                initial: "",
            }),
            customProp1: new StringField({
                required: false,
                blank: true,
                initial: "",
            }),
            customProp2: new StringField({
                required: false,
                blank: true,
                initial: "",
            }),
        };
    }

    /**
     * Migrate legacy hyphenated field names from v11/v12 template.json.
     * @param {Record<string, any>} source
     * @returns {Record<string, any>}
     */
    static migrateData(source) {
        if ("class-description" in source && !("classDescription" in source)) {
            source.classDescription = source["class-description"];
        }
        if ("player-class" in source && !("playerClass" in source)) {
            source.playerClass = source["player-class"] || "none";
        }
        if ("prop-1" in source && !("prop1" in source)) {
            source.prop1 = source["prop-1"] || "none";
        }
        if ("prop-2" in source && !("prop2" in source)) {
            source.prop2 = source["prop-2"] || "none";
        }
        if (source.playerClass === "") source.playerClass = "none";
        if (source.prop1 === "") source.prop1 = "none";
        if (source.prop2 === "") source.prop2 = "none";
        if (typeof source.stats?.wizard === "number" && source.stats.wizard > 6) {
            source.stats.wizard = 6;
        }
        return super.migrateData(source);
    }
}

export class DefinitelyWizardsItemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const { HTMLField, NumberField } = foundry.data.fields;
        return {
            description: new HTMLField({
                required: false,
                blank: true,
                initial: "",
            }),
            quantity: new NumberField({
                required: true,
                integer: true,
                initial: 1,
                min: 0,
            }),
            weight: new NumberField({
                required: true,
                initial: 0,
                min: 0,
            }),
        };
    }
}
