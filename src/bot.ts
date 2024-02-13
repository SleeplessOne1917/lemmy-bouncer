import { GetPersonDetailsResponse, LemmyBot } from 'lemmy-bot';
import {
    parseUsersToAllow,
    isAllowedToPost,
    getInstanceFromActorId,
} from './utils';
import { addToAllowList } from './db';
import { config } from 'dotenv';

config();

const { LOCAL_INSTANCE, USERNAME, PASSWORD, DB_FILE, COMMUNITY } =
    process.env as Record<string, string>;

export const bot = new LemmyBot({
    secure: false,
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
                        content:
                            "Your comment requires manual vetting by a community moderator. If it passes manual review by a moderator, it will be restored.\n\nIf you want to be allowed to comment without without manual vetting every time, please contact one of this community's moderators.",
                        post_id: postId,
                    });
                    const {
                        comment_report_view: {
                            comment_report: { id: reportId },
                        },
                    } = await reportComment({
                        comment_id: id,
                        reason: 'Vetting required',
                    });
                    await removeComment({
                        comment_id: id,
                        reason: 'Cannot comment in !${COMMUNITY}@${LOCAL_INSTANCE} without manual vetting',
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
                        content:
                            "Your post requires manual vetting by a community moderator. If it passes manual review by a moderator, it will be restored.\n\nIf you want to be allowed to post without without manual vetting every time, please contact one of this community's moderators.",
                        post_id: id,
                    });
                    const {
                        post_report_view: {
                            post_report: { id: reportId },
                        },
                    } = await reportPost({
                        post_id: id,
                        reason: 'Vetting required',
                    });
                    await removePost({
                        post_id: id,
                        reason: 'Cannot post in !${COMMUNITY}@${LOCAL_INSTANCE} without manual vetting',
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
                name: COMMUNITY,
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
                let message: string;
                const usersToAllow = parseUsersToAllow(content);

                console.log(usersToAllow);

                if (usersToAllow.length > 0) {
                    const personDetailsList = await Promise.allSettled(
                        usersToAllow.map((username) =>
                            getPersonDetails({ username }),
                        ),
                    );

                    const fulfilled = personDetailsList
                        .filter((res) => res.status === 'fulfilled')
                        .map(
                            (res) =>
                                (
                                    res as PromiseFulfilledResult<GetPersonDetailsResponse>
                                ).value.person_view.person,
                        );

                    await addToAllowList(fulfilled.map((p) => p.id));

                    message =
                        usersToAllow.length === fulfilled.length
                            ? 'All users successfully added!'
                            : fulfilled.length === 0
                              ? 'Could not add any of the users you listed!'
                              : `Added users:${fulfilled.reduce(
                                    (acc, { name, actor_id }) =>
                                        acc +
                                        `\n- @${name}@${getInstanceFromActorId(actor_id)}`,
                                    '',
                                )}\n\nCould not add users:${usersToAllow.reduce(
                                    (acc, user) => {
                                        if (
                                            !fulfilled.some(
                                                ({ actor_id, name }) =>
                                                    user ===
                                                    `${name}@${getInstanceFromActorId(actor_id)}`,
                                            )
                                        ) {
                                            return acc + `\n- @${user}`;
                                        } else {
                                            return acc;
                                        }
                                    },
                                    '',
                                )}`;
                } else {
                    message =
                        'I could not detect any usernames in your message. Please make sure the usernames you want to add follow the format "@user@instance".';
                }

                await sendPrivateMessage({
                    content: message,
                    recipient_id: creator.id,
                });
            }
        },
    },
});
