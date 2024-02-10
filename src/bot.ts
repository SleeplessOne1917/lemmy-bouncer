import { LemmyBot } from 'lemmy-bot';
import { isAllowedToPost } from './utils';

export const bot = new LemmyBot({
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
                    creator,
                    comment: { id },
                    post: { id: postId },
                },
                botActions: { createComment, reportComment, removeComment },
                __httpClient__,
            }) {
                const canPost = await isAllowedToPost(creator);

                if (!canPost) {
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

                    // Have to un-resolve because removing comments auto-resolves reports
                    await __httpClient__.resolveCommentReport({
                        report_id: reportId,
                        resolved: false,
                    });
                }
            },
        },
        post: {
            sort: 'New',
            async handle({
                postView: {
                    creator,
                    post: { id },
                },
                botActions: { createComment, reportPost, removePost },
                __httpClient__,
            }) {
                const canPost = await isAllowedToPost(creator);

                if (!canPost) {
                    await createComment({
                        content: 'Community disclaimer',
                        post_id: id,
                    });
                    const {
                        post_report_view: {
                            post_report: { id: reportId },
                        },
                    } = await reportPost({
                        post_id: id,
                        reason: 'User has yet to be vetted',
                    });
                    await removePost({
                        post_id: id,
                        reason: 'User cannot post to community unless vetted',
                    });

                    // Have to un-resolve because removing comments auto-resolves reports
                    await __httpClient__.resolvePostReport({
                        report_id: reportId,
                        resolved: false,
                    });
                }
            },
        },
    },
});
