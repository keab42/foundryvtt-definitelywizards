import { checkGameState } from "../helpers/gamestate.mjs";
import { DEF_WIZ_PlayerClasses } from "../helpers/PlayerClass.mjs";
import { DEF_WIZ_Props1, DEF_WIZ_Props2, PropSlot } from "../helpers/PropTypes.mjs";
const { renderTemplate } = foundry.applications.handlebars;

/**
 * Extend the base Actor document with the functionality we need for tracking stats
 * @extends {Actor}
 */
export class DefWizActor extends Actor {

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
    const actorData = this;
    const flags = actorData.flags.definitelywizards || {};
  }

  async updateStat(statType, offset) {
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

  async resetStat(statType) {
    switch (statType) {
      case "wizard":
        const wizardStat = this.system.coreStats.wizard;
        const newWizardValue = 2;
        await this.update({ "system.coreStats.wizard": newWizardValue });
        await this._postStatUpdateToChat(game.i18n.localize("DW.Wizard"), wizardStat, newWizardValue);
        break;
      case "wild":
        const wildStat = this.system.coreStats.wild;
        const newWildValue = 2;
        await this.update({ "system.coreStats.wild": newWildValue });
        await this._postStatUpdateToChat(game.i18n.localize("DW.Wild"), wildStat, newWildValue);
        break;
      default:
        break;
    }
  }

  async _postStatUpdateToChat(statType, oldValue, newValue) {
    const template = "systems/def-wiz-2/templates/chat/actor-stat-update.hbs";

    let templateData = {
      statType: statType,
      oldValue: oldValue,
      newValue: newValue,
      owner: this.id
    };

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate(template, templateData),
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  async updateClass(classKey) {
    const newClass = DEF_WIZ_PlayerClasses.find(c => c.name === classKey);
    if (!newClass) {
      return;
    }

    let customClass = "";
    if (classKey == "custom") {
      customClass = game.i18n.localize("DW.CustomClass");
    }

    const updateData = {
      "system.playerClass.value": newClass.name,
      "system.playerClass.description": game.i18n.localize(newClass.descriptionKey),
      "system.playerClass.customClassName": customClass
    };

    await this.update(updateData);
    await this._postClassUpdateToChat(classKey);
  }

  async _postClassUpdateToChat(classKey) {
    const template = "systems/def-wiz-2/templates/chat/actor-class-update.hbs";

    const playerClass = DEF_WIZ_PlayerClasses.find(c => c.name === classKey);
    if (!playerClass) {
      return;
    }

    let templateData = {
      className: playerClass.nameTranslationKey,
      classDesc: playerClass.descriptionKey,
      owner: this.id
    };

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate(template, templateData),
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  async updateProp(propSlot, propKey) {
    let updateData = {};

    console.log("updating prop");
    console.log(propSlot);
    console.log(propKey);

    let customProp = "";
    if (propKey == "custom") {
      customProp = game.i18n.localize("DW.CustomProp");
    }

    switch (propSlot) {
      case PropSlot.PROP1:
        const prop1 = DEF_WIZ_Props1.find(p => p.name === propKey);
        console.log(prop1);
        if (!prop1) {
          return;
        }
        updateData = {
          "system.playerProps.prop1.value": prop1.name,
          "system.playerProps.prop1.customPropName": customProp
        };
        break;
      case PropSlot.PROP2:
        const prop2 = DEF_WIZ_Props2.find(p => p.name === propKey);
        if (!prop2) {
          return;
        }
        updateData = {
          "system.playerProps.prop2.value": prop2.name,
          "system.playerProps.prop2.customPropName": customProp
        };
        break;
      default:
        break;
    }

    console.log(updateData);

    await this.update(updateData)
    await this._postPropUpdateToChat(propSlot, propKey);

  }

  async _postPropUpdateToChat(propSlot, propKey) {
    const template = "systems/def-wiz-2/templates/chat/actor-prop-update.hbs";
    let prop = {};

    switch (propSlot) {
      case PropSlot.PROP1:
        prop = DEF_WIZ_Props1.find(p => p.name === propKey);
        break;
      case PropSlot.PROP2:
        prop = DEF_WIZ_Props2.find(p => p.name === propKey);
        break;
      default:
        break;
    }

    let templateData = {
      propName: prop.nameTranslationKey,
      owner: this.id
    };

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate(template, templateData),
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

}
