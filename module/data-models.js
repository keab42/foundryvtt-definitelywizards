const DEFAULT_BIO =
    '<p>Everyone knows the proper way to gain arcane abilities is through discipline and years of study. Magic is temperamental, and it\'s too dangerous to let anybody who just happens to have "inner power" cast spells. Wizards who have worked studiously and been tested on their capabilities are the only ones we can trust with that power.</p> <p>Unfortunately for you, this means all other sources of magic have been declared illegal. If you want to take jobs where spellcasting is a requirement, you must be a licensed wizard. Your party has completed the paperwork and written test and now face the final challenge: completing the Wizard Certification Practical Exam.</p><p>The exam is a series of trials designed to test your magical competence, skill, and control. Your party must complete these challenges while keeping up the illusion that you are wise and dignified wizards, not a ragtag bunch whose magic is from anything but book learning.</p>';

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
            description: "",
        },
    },
    props1: {
        none: {
            label: "Roll",
        },
        hat: {
            label: "A Pointy Hat and Robes",
        },
        beard: {
            label: "A Long Fake Beard",
        },
        tome: {
            label: "A Massive Tome",
        },
        "fake-wand": {
            label: "A Fake Wand",
        },
        familar: {
            label: "A Familiar",
        },
        custom: {
            label: "Create your own item",
        },
    },
    props2: {
        none: {
            label: "Roll",
        },
        glitter: {
            label: "A Pocket Full of Glitter",
        },
        belt: {
            label: "A Belt with lots of Pouches",
        },
        glasses: {
            label: "A Pair of Spectacles",
        },
        amulet: {
            label: "A Costume-quality Amulet",
        },
        quill: {
            label: "A Quill and Parchment",
        },
        custom: {
            label: "Create your own item",
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
                    max: 7,
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
