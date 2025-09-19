type PlayerClass = {
  name: string;
  nameTranslationKey: string;
  descriptionKey: string;
};

export const PlayerClasses: PlayerClass[] = [
  {
    name: "none",
    nameTranslationKey: "DW.None",
    descriptionKey: "DW.NoClassDescription",
  },
  {
    name: "d6familiars",
    nameTranslationKey: "DW.2d6FamiliarsinaTrenchcoat",
    descriptionKey: "DW.FamiliarsDescription",
  },
  {
    name: "alchemist",
    nameTranslationKey: "DW.Alchemist",
    descriptionKey: "DW.AlchemistDescription",
  },
  {
    name: "bard",
    nameTranslationKey: "DW.Bard",
    descriptionKey: "DW.BardDescription",
  },
  {
    name: "chosenone",
    nameTranslationKey: "DW.ChosenOne",
    descriptionKey: "DW.ChosenOneDescription",
  },
  {
    name: "collector",
    nameTranslationKey: "DW.Collector",
    descriptionKey: "DW.CollectorDescription",
  },
  {
    name: "druid",
    nameTranslationKey: "DW.Druid",
    descriptionKey: "DW.DruidDescription",
  },
  {
    name: "elementalblood",
    nameTranslationKey: "DW.ElementalBlood",
    descriptionKey: "DW.ElementalBloodDescription",
  },
  {
    name: "magician",
    nameTranslationKey: "DW.Magician",
    descriptionKey: "DW.MagicianDescription",
  },
  {
    name: "musclemagic",
    nameTranslationKey: "DW.MuscleMagic",
    descriptionKey: "DW.MuscleMagicDescription",
  },
  {
    name: "vampire",
    nameTranslationKey: "DW.Vampire",
    descriptionKey: "DW.VampireDescription",
  },
  {
    name: "custom",
    nameTranslationKey: "DW.CustomClass",
    descriptionKey: "DW.CustomClass",
  },
];
