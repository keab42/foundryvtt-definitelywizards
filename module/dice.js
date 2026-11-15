const CONSEQUENCES_ROLL = "1d6";

/**
 * Resolve an Actor document from a UUID or world Actor ID.
 * @param {string} actorRef
 * @returns {Promise<DefinitelyWizardsActorLike | null>}
 */
export async function resolveActor(actorRef) {
    if (!actorRef) return null;
    if (actorRef.includes(".")) {
        const doc = await foundry.utils.fromUuid(actorRef);
        if (doc?.documentName === "Actor") {
            return doc;
        }
    }
    return game.actors.get(actorRef) ?? null;
}

/**
 * Roll a Wizard or Wild check, enforcing stat-6 lockouts, Wit Bonus display, and opposite-stat resets.
 * @param {Actor} actor
 * @param {RollSkillOptions} [options]
 * @returns {Promise<ChatMessage | undefined | null>}
 */
export async function rollSkill(
    actor,
    { isWizardRoll = true, formula = "1d6", spell = null, customSpellName = "" } = {},
) {
    const wizardVal = Number(actor.system.stats.wizard);
    const wildVal = Number(actor.system.stats.wild);

    if (wildVal >= 7) {
        ui.notifications.warn(game.i18n.localize("DW.AlreadyArrestedWarning"));
        return null;
    }
    if (wizardVal >= 6 && wildVal >= 6) {
        ui.notifications.warn(game.i18n.localize("DW.BothStatsLockedWarning"));
        return null;
    }
    if (isWizardRoll && wizardVal >= 6) {
        ui.notifications.warn(game.i18n.localize("DW.WizardLockedWarning"));
        return null;
    }
    if (!isWizardRoll && wildVal >= 6) {
        ui.notifications.warn(game.i18n.localize("DW.WildLockedWarning"));
        return null;
    }

    const currentValue = isWizardRoll ? wizardVal : wildVal;
    const wasOppositeLocked = isWizardRoll ? wildVal === 6 : wizardVal === 6;

    const roll = new Roll(formula, actor.getRollData());
    await roll.evaluate();

    const isSuccess = roll.total <= currentValue;
    const isWitBonus = formula.startsWith("2d6");
    const diceResults =
        roll.dice[0]?.results?.map((dieResult) => ({
            result: dieResult.result,
            active: Boolean(dieResult.active),
        })) ?? [];

    let autoResetWizard = false;
    let autoResetWild = false;

    if (isSuccess && isWizardRoll) {
        await actor.updateStat?.(true, 1, { suppressBothLockedAlert: wasOppositeLocked });
        if (wasOppositeLocked) {
            await actor.resetStat?.(false);
            autoResetWild = true;
        }
    } else if (isSuccess && !isWizardRoll && wasOppositeLocked) {
        await actor.resetStat?.(true);
        autoResetWizard = true;
    }

    const trimmedCustomSpell = typeof customSpellName === "string" ? customSpellName.trim() : "";

    const template = "systems/definitely-wizards/templates/chat/skill-roll-chat.hbs";
    const templateData = {
        isWizardRoll,
        isSuccess,
        isWitBonus,
        diceResults,
        diceFormula: roll.formula,
        diceTotal: roll.total,
        autoResetWizard,
        autoResetWild,
        owner: actor.id,
        actorUuid: actor.uuid,
        actorName: actor.name,
        spellName: trimmedCustomSpell || spell?.name || "",
        spellDescription: spell?.system?.description ?? "",
        spellImg: spell?.img ?? "",
    };

    return ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: await foundry.applications.handlebars.renderTemplate(template, templateData),
        rolls: [roll],
        sound: CONFIG.sounds.dice,
    });
}

/**
 * Roll 1d6 on the consequences table for a failed Wizard or Wild roll.
 * @param {string} actorRef
 * @param {boolean} isWizardRoll
 * @param {object} [options]
 * @param {string} [options.sourceMessageId=""]
 * @returns {Promise<ChatMessage | undefined | null>}
 */
export async function rollConsequences(actorRef, isWizardRoll, { sourceMessageId = "" } = {}) {
    const actor = await resolveActor(actorRef);
    if (!actor) return null;

    const roll = new Roll(CONSEQUENCES_ROLL, actor.getRollData());
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
    } else {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardCriticalFailConsequence")
            : game.i18n.localize("DW.WildCriticalFailConsequence");
        await actor.updateStat(false, 1);
    }

    const template = "systems/definitely-wizards/templates/chat/consequences-roll-chat.hbs";
    const templateData = {
        isWizardRoll,
        resultMessage,
        diceFormula: roll.formula,
        diceTotal: roll.total,
        owner: actor.id,
        actorUuid: actor.uuid,
    };

    return ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: await foundry.applications.handlebars.renderTemplate(template, templateData),
        rolls: [roll],
        sound: CONFIG.sounds.dice,
        flags: sourceMessageId
            ? {
                  "definitely-wizards": {
                      resolvedMessageId: sourceMessageId,
                      resolutionType: "consequences",
                      resolverName: actor.name,
                  },
              }
            : {},
    });
}

/**
 * Cause a distraction to Cover for a teammate's failed roll (+1 Wild on the covering actor).
 * @param {DefinitelyWizardsActorLike} coveringActor
 * @param {string} sourceMessageId
 * @param {string} targetActorName
 * @returns {Promise<ChatMessage | undefined>}
 */
export async function coverForRoll(coveringActor, sourceMessageId, targetActorName) {
    /** @type {string[]} */
    const relatedMessageIds = [];
    await coveringActor.updateStat(false, 1, { createdMessageIds: relatedMessageIds });

    const safeCoverer = foundry.utils.escapeHTML(coveringActor.name);
    const targetName = targetActorName || game.i18n.localize("DW.TeammateFallback");
    const safeTarget = foundry.utils.escapeHTML(targetName);
    const safeCoverActorUuid = foundry.utils.escapeHTML(coveringActor.uuid);
    const undoLabel = foundry.utils.escapeHTML(game.i18n.localize("DW.UndoCoverButton"));

    return ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: coveringActor }),
        content: `<div class="definitelywizards chat-card cover-card">
            <p>${game.i18n.format("DW.CoverMessage", {
                coverer: safeCoverer,
                target: safeTarget,
            })}</p>
            <div class="card-buttons">
                <button type="button" class="undoCover" data-actor-uuid="${safeCoverActorUuid}">${undoLabel}</button>
            </div>
        </div>`,
        flags: {
            "definitely-wizards": {
                resolvedMessageId: sourceMessageId,
                resolutionType: "covered",
                resolverName: coveringActor.name,
                coveringActorUuid: coveringActor.uuid,
                relatedMessageIds,
            },
        },
    });
}
