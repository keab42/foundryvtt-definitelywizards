const consequencesRoll = "1d6";

/**
 * Roll 1d6 on the consequences table for a failed Wizard or Wild roll.
 * @param {string} actorID
 * @param {boolean} isWizardRoll
 */
export async function rollConsequences(actorID, isWizardRoll) {
    const template = "systems/definitely-wizards/templates/chat/consequences-roll-chat.hbs";
    const actor = game.actors.get(actorID);
    if (!actor) return;

    const roll = new Roll(consequencesRoll, actor.getRollData());
    await roll.evaluate();

    let resultMessage = "";

    if (roll.total <= 2) {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardDudConsequence")
            : game.i18n.localize("DW.WildDudConsequence");
    } else if (roll.total <= 4) {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardMinorFailConsequence")
            : game.i18n.localize("DW.WildMinorFailConsequence");

        await actor.updateStat(false, 1);
    } else if (roll.total <= 6) {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardCriticalFailConsequence")
            : game.i18n.localize("DW.WildCriticalFailConsequence");

        await actor.updateStat(false, 1);
    }

    const templateData = {
        isWizardRoll,
        resultMessage,
        diceFormula: roll.formula,
        diceTotal: roll.total,
        owner: actor.id,
    };

    const rollMessage = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: await foundry.applications.handlebars.renderTemplate(template, templateData),
        rolls: [roll],
        sound: CONFIG.sounds.dice,
    };

    await ChatMessage.create(rollMessage);
}
