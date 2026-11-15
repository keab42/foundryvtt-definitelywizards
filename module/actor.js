/**
 * Extend the base Actor document for the Definitely Wizards system.
 */
export class DefinitelyWizardsActor extends Actor {
    /**
     * Adjust either the Wizard or Wild stat by an offset.
     * @param {boolean} isWizard
     * @param {number} offset
     */
    async updateStat(isWizard, offset) {
        let wizardStat = Number(this.system.stats.wizard);
        let wildStat = Number(this.system.stats.wild);
        let oldValue = 0;
        let newValue = 0;

        if (isWizard) {
            oldValue = wizardStat;
            wizardStat += offset;
            newValue = wizardStat;
        } else {
            oldValue = wildStat;
            wildStat += offset;
            newValue = wildStat;
        }

        if (newValue >= 0 && newValue <= 7) {
            await this.update({
                "system.stats.wizard": wizardStat,
                "system.stats.wild": wildStat,
            });

            await this._postUpdateToChat(isWizard, oldValue, newValue);

            if (!isWizard && wildStat >= 7) {
                await ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor: this }),
                    content: game.i18n.localize("DW.EndGame"),
                });
            }
        }
    }

    /**
     * Reset either the Wizard or Wild stat back to 2.
     * @param {boolean} isWizard
     */
    async resetStat(isWizard) {
        let wizardStat = Number(this.system.stats.wizard);
        let wildStat = Number(this.system.stats.wild);
        let oldValue = 0;
        let newValue = 0;

        if (isWizard) {
            oldValue = wizardStat;
            wizardStat = 2;
            newValue = wizardStat;
        } else {
            oldValue = wildStat;
            wildStat = 2;
            newValue = wildStat;
        }

        await this.update({
            "system.stats.wizard": wizardStat,
            "system.stats.wild": wildStat,
        });

        await this._postUpdateToChat(isWizard, oldValue, newValue);
    }

    /**
     * Post a stat change card to the chat log.
     * @param {boolean} isWizard
     * @param {number} oldValue
     * @param {number} newValue
     */
    async _postUpdateToChat(isWizard, oldValue, newValue) {
        const template = "systems/definitely-wizards/templates/chat/actor-stat-update-chat.hbs";
        const templateData = {
            isWizardRoll: isWizard,
            oldValue,
            newValue,
            owner: this.id,
        };

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: await foundry.applications.handlebars.renderTemplate(template, templateData),
            style: CONST.CHAT_MESSAGE_STYLES.OOC,
        });
    }
}
