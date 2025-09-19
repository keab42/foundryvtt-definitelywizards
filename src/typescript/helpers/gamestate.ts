import DefWizActor from "../documents/actor";

export function checkGameState(actor: DefWizActor) {
    const wildStat = actor.system.coreStats.wild;

    if (wildStat >= 7) {
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker(actor),
            content: game.i18n.localize("DW.EndGame")
        });
    }
}