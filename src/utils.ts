import { Person } from 'lemmy-bot';
import { isUserIdInAllowlist } from './db';

const FEDERATED_INSTANCE_ALLOWLIST: string[] = [];

export function initInstanceAllowlist() {
    if (FEDERATED_INSTANCE_ALLOWLIST.length === 0) {
        const instances = (process.env.FEDERATED_INSTANCE_ALLOWLIST as string)
            .trim()
            .split(/\s+/);

        FEDERATED_INSTANCE_ALLOWLIST.push(...instances);
    }
}

const actorIdRegex =
    /https?:\/\/([^\/]+(?:(?:\.[^\/]{2,})|(?::\d{2,5})))\/u\/\S+/;

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
    FEDERATED_INSTANCE_ALLOWLIST.some(
        (instance) => instance === getInstanceFromActorId(actor_id),
    ) ||
    (await isUserIdInAllowlist(id));

const userExtractRegex = /@(\S{3,})@(\S+(?:(?:\.\S{2,})|(?::\d{2,5})))/g;

export function parseUsersToAllow(message: string) {
    const users: string[] = [];

    for (
        let match = userExtractRegex.exec(message);
        match;
        match = userExtractRegex.exec(message)
    ) {
        users.push(`${match[1]}@${match[2]}`);
    }

    return [...new Set(users)];
}
