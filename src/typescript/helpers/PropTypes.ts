export enum PropSlot {
    prop1 = "prop1",
    prop2 = "prop2"
}

export type Prop = {
    name: string;
    nameTranslationKey: string;
    descriptionKey: string;
}

export const Props1: Prop[] = [
    { name: "none", nameTranslationKey: "DW.None", descriptionKey: "DW.NoPropDescription" },
    { name: "arcaneFocus", nameTranslationKey: "DW.ArcaneFocus", descriptionKey: "DW.ArcaneFocusDescription" },
    { name: "hat", nameTranslationKey: "DW.PointyHat", descriptionKey: "DW.PointyHatDescription" },
    { name: "beard", nameTranslationKey: "DW.FakeBeard", descriptionKey: "DW.FakeBeardDescription" },
    { name: "tome", nameTranslationKey: "DW.Tome", descriptionKey: "DW.TomeDescription" },
    { name: "fakewand", nameTranslationKey: "DW.FakeWand", descriptionKey: "DW.FakeWandDescription" },
    { name: "familiar", nameTranslationKey: "DW.Familiar", descriptionKey: "DW.FamiliarDescription" },
    { name: "custom", nameTranslationKey: "DW.CustomProp", descriptionKey: "DW.CustomPropDescription" }
];

export const Props2: Prop[] = [
    { name: "none", nameTranslationKey: "DW.None", descriptionKey: "DW.NoPropDescription" },
    { name: "glitter", nameTranslationKey: "DW.Glitter", descriptionKey: "DW.GlitterDescription" },
    { name: "belt", nameTranslationKey: "DW.Belt", descriptionKey: "DW.BeltDescription" },
    { name: "glasses", nameTranslationKey: "DW.Spectacles", descriptionKey: "DW.SpectaclesDescription" },
    { name: "amulet", nameTranslationKey: "DW.Amulet", descriptionKey: "DW.AmuletDescription" },
    { name: "quill", nameTranslationKey: "DW.Quill", descriptionKey: "DW.QuillDescription" },
    { name: "custom", nameTranslationKey: "DW.CustomProp", descriptionKey: "DW.CustomPropDescription" }
];