import { DataSchema } from "fvtt-types/src/foundry/common/data/fields.mjs";
import { AnyObject, EmptyObject } from "fvtt-types/src/utils/index.mjs";

type AnyDocument = foundry.abstract.Document.Any;

export class DefWizBaseActorDataModel<
  Schema extends DataSchema,
  Parent extends AnyDocument,
  BaseData extends AnyObject = EmptyObject,
  DerivedData extends AnyObject = EmptyObject
> extends foundry.abstract.TypeDataModel<
  Schema,
  Parent,
  BaseData,
  DerivedData
> {
  static LOCALIZATION_PREFIXES = ["DEF_WIZ.Actor.base"];

  prepareDerivedData() {
    // No derived data for now.
  }
}
