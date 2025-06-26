export default class DefWizActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["DEF_WIZ.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.wizard = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 3, min: 0})
    })

    schema.wild = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 3, min: 0})
    })

    schema.biography = new fields.HTMLField();

    return schema;
  }
}
