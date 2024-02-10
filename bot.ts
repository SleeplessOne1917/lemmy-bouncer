import { LemmyBot } from 'lemmy-bot';
import { isUserIdInAllowlist } from './db';

const allowedInstances = ['lemmygrad.ml'];

const actorIdRegex = /https?\/\/([^\/]+\.[^\/]+)\/u\/\S+/;

function getInstanceFromActorId(actorId: string) {
    const match = actorIdRegex.exec(actorId);

    if (match) {
        return match[1];
    } else {
        console.log(`Could not parse instance from ${actorId}`);
        return null;
    }
}

const bot = new LemmyBot({
    instance: 'hexbear.net',
    credentials: {
        password: 'password',
        username: 'bouncerbot',
    },
    dbFile: 'db.sqlite3',
    federation: {
        allowList: [
            {
                instance: 'hexbear.net',
                communities: ['traaaaaaannnnnnnnnns'],
            },
        ],
    },
    handlers: {
        comment: {
            sort: 'New',
            async handle({
                commentView: {
                    creator: { actor_id, id: personId, local },
                    comment: { id },
                },
            }) {
                if (
                    !(
                        local ||
                        allowedInstances.some(
                            (instance) =>
                                instance === getInstanceFromActorId(actor_id),
                        ) ||
                        (await isUserIdInAllowlist(personId))
                    )
                ) {
                }
            },
        },
    },
});
