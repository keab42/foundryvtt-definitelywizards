export function checkGameState(actor) {
    const wildStat = actor.system.stats.wild.value;

    if (wildStat >= 7) {
        ChatMessage.create({
            user: game.user.id,  // avoid deprecation warning, backwards compatible
            speaker: ChatMessage.getSpeaker(actor),
            content: game.i18n.localize("DW.EndGame")
        });
    }
}