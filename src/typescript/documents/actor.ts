import { checkGameState } from "../helpers/gamestate";
import { SystemTemplates } from "../helpers/system-templates";
import { PlayerClasses } from "../helpers/PlayerClass";
import { Prop, Props1, Props2, PropSlot } from "../helpers/PropTypes";
import { DefWizPlayerCharacterModel } from "../data/actor-character";
const { renderTemplate } = foundry.applications.handlebars;

declare global {
  interface SourceConfig {
    Actor: DefWizPlayerCharacterModel;
  }
  interface DataConfig {
    Actor: DefWizPlayerCharacterModel;
  }
  interface DocumentClassConfig {
    Actor: typeof DefWizActor;
  }
}

/**
 * Extend the base Actor document with the functionality we need for tracking stats
 * @extends {Actor}
 */
export default class DefWizActor extends Actor {
  // @ts-expect-error - Foundry initializes this.
  system: SystemTemplates.PlayerCharacter;

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data that isn't
   * handled by the actor's DataModel. Data calculated in this step should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  async updateStat(statType: string, offset: number) {
    var oldValue = 0;
    var newValue = 0;
    var localizedChatLabel = "";
    var updateData = {};

    switch (statType) {
      case "wizard":
        oldValue = this.system.coreStats.wizard;
        newValue = oldValue + offset;
        localizedChatLabel = game.i18n.localize("DW.Wizard");
        updateData = { "system.coreStats.wizard": newValue };
        break;
      case "wild":
        oldValue = this.system.coreStats.wild;
        newValue = oldValue + offset;
        localizedChatLabel = game.i18n.localize("DW.Wild");
        updateData = { "system.coreStats.wild": newValue };
        break;
      default:
        return;
    }

    await this.update(updateData);
    await this._postStatUpdateToChat(localizedChatLabel, oldValue, newValue);

    checkGameState(this);
  }

  async resetStat(statType: string) {
    var oldValue = 0;
    var newValue = 0;
    var updateData = {};
    var localizedChatLabel = "";

    switch (statType) {
      case "wizard":
        oldValue = this.system.coreStats.wizard;
        newValue = 2;
        localizedChatLabel = game.i18n.localize("DW.Wizard");
        updateData = { "system.coreStats.wizard": newValue };
        break;
      case "wild":
        oldValue = this.system.coreStats.wild;
        newValue = 2;
        localizedChatLabel = game.i18n.localize("DW.Wild");
        updateData = { "system.coreStats.wild": newValue };
        break;
      default:
        break;
    }

    await this.update(updateData);
    await this._postStatUpdateToChat(localizedChatLabel, oldValue, newValue);
  }

  async _postStatUpdateToChat(
    statType: string,
    oldValue: number,
    newValue: number
  ) {
    const template = "systems/def-wiz-2/templates/chat/actor-stat-update.hbs";

    let templateData = {
      statType: statType,
      oldValue: oldValue,
      newValue: newValue,
      owner: super.id,
    };

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate(template, templateData),
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
    });
  }

  async updateClass(classKey: string) {
    const playerClass = PlayerClasses.find((c) => c.name === classKey);

    await this.update({
      "system.playerClass.value": game.i18n.localize(
        playerClass?.nameTranslationKey
      ),
    });
    await this.update({
      "system.playerClass.description": game.i18n.localize(
        playerClass?.descriptionKey
      ),
    });

    let customClass = "";
    if (playerClass?.name == "custom") {
      customClass = game.i18n.localize("DW.CustomClass") ?? "DW.CustomClass";
    }
    await this.update({ "system.playerClass.customClassName": customClass });

    await this._postClassUpdateToChat(classKey);
  }

  async _postClassUpdateToChat(classKey: string) {
    const template = "systems/def-wiz-2/templates/chat/actor-class-update.hbs";
    const playerClass = PlayerClasses.find((c) => c.name === classKey);

    if (!playerClass) {
      return;
    }

    const className = game.i18n.localize(playerClass.nameTranslationKey);
    const classDesc = game.i18n.localize(playerClass.descriptionKey);

    let templateData = {
      className: className,
      classDesc: classDesc,
      owner: super.id,
    };

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate(template, templateData),
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
    });
  }

  async updateProp(propName: string, propSlot: PropSlot) {
    var playerProp: Prop;
    var updateData = {};
    var localizedChatLabel = "";

    let customProp = "";
    if (propName == "custom") {
      customProp = game.i18n.localize("DW.CustomProp") ?? "DW.CustomProp";
    }

    switch (propSlot) {
      case PropSlot.prop1:
        var prop = Props1.find((p) => p.name === propName);
        if (!prop) {
          return;
        }
        playerProp = prop;
        updateData = {
          "system.playerProps.prop1.value": prop.name,
          "system.playerProps.prop1.customPropName": customProp,
        };
        localizedChatLabel = game.i18n.localize(
          prop.nameTranslationKey
        );
        break;
      case PropSlot.prop2:
        var prop = Props2.find((p) => p.name === propName);
        if (!prop) {
          return;
        }
        playerProp = prop;
        updateData = {
          "system.playerProps.prop2.value": prop.name,
          "system.playerProps.prop2.customPropName": customProp,
        };
        localizedChatLabel = game.i18n.localize(prop.nameTranslationKey);
        break;
      default:
        return;
    }

    await this.update(updateData);
    await this._postPropUpdateToChat(propName);
  }

  async _postPropUpdateToChat(propName: string) {
    const template = "systems/def-wiz-2/templates/chat/actor-prop-update.hbs";

    let templateData = {
      propName: propName,
      owner: super.id,
    };

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate(template, templateData),
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
    });
  }

  async update(data: any, options: any = {}) {
    return super.update(data, options);
  }

}
