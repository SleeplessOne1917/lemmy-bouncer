import { PersonMentionView } from 'lemmy-bot';
import { isUserIdInAllowlist } from './db';

type Person = PersonMentionView['creator']; // I really should export all of the lemmy-js-client types from lemmy-bot

const actorIdRegex = /https?\/\/([^\/]+\.[^\/]+)\/u\/\S+/;

const allowedInstances = ['lemmygrad.ml'];

export function getInstanceFromActorId(actorId: string) {
    const match = actorIdRegex.exec(actorId);

    if (match) {
        return match[1];
    } else {
        console.log(`Could not parse instance from ${actorId}`);
        return null;
    }
}

export const isAllowedToPost = async ({ actor_id, id, local }: Person) =>
    local ||
    allowedInstances.some(
        (instance) => instance === getInstanceFromActorId(actor_id),
    ) ||
    (await isUserIdInAllowlist(id));