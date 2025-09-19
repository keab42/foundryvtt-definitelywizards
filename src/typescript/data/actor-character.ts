import { fields } from "fvtt-types/src/foundry/common/data/_module.mjs";
import { DefWizBaseActorDataModel } from "./base-actor";
import { DataSchema } from "fvtt-types/src/foundry/common/data/fields.mjs";
import DefWizActor from '../documents/actor';

const requiredInteger = { required: true, nullable: false, integer: true };
const basePlayerCharacterSchema = {
  coreStats: new fields.SchemaField({
    wizard: new fields.NumberField({
      ...requiredInteger,
      initial: 3,
      min: 0,
      max: 7,
    }),
    wild: new fields.NumberField({
      ...requiredInteger,
      initial: 3,
      min: 0,
      max: 7,
    }),
  }),
  playerClass: new fields.SchemaField({
    value: new fields.StringField(),
    description: new fields.StringField(),
    customClassName: new fields.StringField(),
  }),
  playerProps: new fields.SchemaField({
    prop1: new fields.SchemaField({
      value: new fields.StringField(),
      customPropName: new fields.StringField(),
    }),
    prop2: new fields.SchemaField({
      value: new fields.StringField(),
      customPropName: new fields.StringField(),
    }),
  }),
  biography: new fields.HTMLField(),
};

type BasePlayerCharacterSchema = typeof basePlayerCharacterSchema;
export class DefWizPlayerCharacterModel extends DefWizBaseActorDataModel<
  BasePlayerCharacterSchema,
  DefWizActor
> {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "DEF_WIZ.Actor.Character",
  ];

  static defineSchema(): BasePlayerCharacterSchema {
    return basePlayerCharacterSchema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // No derived data for now.
  }

  getRollData() {
    const data = {};

    return data;
  }
}
