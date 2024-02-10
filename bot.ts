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
                    post: { id: postId },
                },
                botActions: { createComment, reportComment, removeComment },
                __httpClient__,
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
                    await createComment({
                        parent_id: id,
                        content: 'Community disclaimer',
                        post_id: postId,
                    });
                    const {
                        comment_report_view: {
                            comment_report: { id: reportId },
                        },
                    } = await reportComment({
                        comment_id: id,
                        reason: 'User has yet to be vetted',
                    });
                    await removeComment({
                        comment_id: id,
                        reason: 'User cannot post to community unless vetted',
                    });

                    await __httpClient__.resolveCommentReport({
                        report_id: reportId,
                        resolved: false,
                    });
                }
            },
        },
    },
});
