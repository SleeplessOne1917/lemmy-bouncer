import { LemmyBot } from 'lemmy-bot';
import { parseUsersToAllow, isAllowedToPost } from './utils';
import { addToAllowList } from './db';

const { LOCAL_INSTANCE, USERNAME, PASSWORD, DB_FILE, COMMUNITY } =
    process.env as Record<string, string>;

export const bot = new LemmyBot({
    instance: LOCAL_INSTANCE,
    credentials: {
        password: PASSWORD,
        username: USERNAME,
    },
    dbFile: DB_FILE,
    federation: {
        allowList: [
            {
                instance: LOCAL_INSTANCE,
                communities: [COMMUNITY],
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
                botActions: {
                    createComment,
                    reportComment,
                    removeComment,
                    resolveCommentReport,
                },
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
                        removed: true,
                    });

                    // Have to un-resolve because removing comments auto-resolves reports
                    await resolveCommentReport({
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
                botActions: {
                    createComment,
                    reportPost,
                    removePost,
                    resolvePostReport,
                },
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
                        removed: true,
                    });

                    // Have to un-resolve because removing comments auto-resolves reports
                    await resolvePostReport({
                        report_id: reportId,
                        resolved: false,
                    });
                }
            },
        },
        async privateMessage({
            messageView: {
                private_message: { content },
                creator,
            },
            botActions: {
                isCommunityMod,
                getCommunity,
                getPersonDetails,
                sendPrivateMessage,
            },
        }) {
            const communityResponse = await getCommunity({
                name: `${COMMUNITY}@${LOCAL_INSTANCE}`,
            }).catch(() => null);

            if (!communityResponse) {
                console.log('error finding community');
                return;
            }

            const isMod = await isCommunityMod({
                community: communityResponse.community_view.community,
                person: creator,
            });

            if (isMod) {
                const userSearchOptions = parseUsersToAllow(content);

                await Promise.allSettled(
                    userSearchOptions.map((username) =>
                        getPersonDetails({ username }).then((user) =>
                            addToAllowList(user.person_view.person.id),
                        ),
                    ),
                );

                await sendPrivateMessage({
                    content: 'Users added!',
                    recipient_id: creator.id,
                });
            }
        },
    },
});
