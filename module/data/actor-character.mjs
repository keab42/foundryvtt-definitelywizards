import DefWizActorBase from "./base-actor.mjs";

export default class DefWizCharacter extends DefWizActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "DEF_WIZ.Actor.Character",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.playerClass = new fields.SchemaField({
      value: new fields.StringField(),
      description: new fields.StringField(),
      customClassName: new fields.StringField(),
    });

    schema.playerProps = new fields.SchemaField({
      prop1: new fields.SchemaField({
        value: new fields.StringField(),
        customPropName: new fields.StringField(),
      }),
      prop2: new fields.SchemaField({
        value: new fields.StringField(),
        customPropName: new fields.StringField(),
      })
    });

    return schema;
  }

}
