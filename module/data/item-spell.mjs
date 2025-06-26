import DefWizItemBase from './base-item.mjs';

export default class DefWizSpell extends DefWizItemBase {
  static LOCALIZATION_PREFIXES = [
    'DEF_WIZ.Item.base',
    'DEF_WIZ.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 0,
      max: 9,
    });

    return schema;
  }
}
