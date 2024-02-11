import { Person } from 'lemmy-bot';
import { isUserIdInAllowlist } from './db';

const actorIdRegex = /https?\/\/([^\/]+\.[^\/]+)\/u\/\S+/;

const FEDERATED_INSTANCE_ALLOWLIST: string[] = [];

export function initInstanceAllowlist() {
    if (FEDERATED_INSTANCE_ALLOWLIST.length === 0) {
        const instances = (process.env.FEDERATED_INSTANCE_ALLOWLIST as string)
            .trim()
            .split(/\s+/);

        FEDERATED_INSTANCE_ALLOWLIST.push(...instances);
    }
}

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

const userExtractRegex = /.*(@(\S{3,})@(\S+\.\S{2,})).*/i;

export function parseUsersToAllow(message: string) {
    const users: string[] = [];

    for (
        let match = userExtractRegex.exec(message);
        match;
        match = userExtractRegex.exec(message)
    ) {
        users.push(`${match[2]}@${match[3]}`);
    }

    return new Set(users);
}
