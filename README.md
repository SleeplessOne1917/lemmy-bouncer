<div align="center">
  <h1>Lemmy Bouncer</h1>
  <img src="images/lemmy-bouncer.png" alt="Lemmy Bouncer" height="500px" wifth="500px"/>
  <p>Are you on the list? No? Sorry, but I can't let you in.</p>
</div>

-----------------------------

## Keep your Lemmy community safe

Lemmy Bouncer makes it so that users who aren't from instances in an allow-list cannot post or comment in your community without having each post/comment vetted by a community moderator. If you know someone from another instance is safe, you can add them to a user allow-list so they don't have to have all of their activity vetted.

## Setup

### Required software
The bot requires NodeJS version 18 or higher to run. You can install dependencies using any of the popular JS package managers (npm, yarn, pnpm). Since the lockfile for the repo is generated from pnpm, you may get faster installation times by using pnpm.

### Create an acount for your bouncer
In order to perform moderator actions, your bot will need an account. **Don't forget to appoint the bot as a moderator of the community you want it to protect!**

### Configuration
Create a file titled `.env` in the topmost directory of the repo. Here, you can set the following environment variables:

#### `LOCAL_INSTANCE`
The instance your bot's account will be on. Make sure to use just the domain name instead of a full URL. i.e:

✅ lemmy.ml

❌ https<span>://</span><span>lemmy.ml</span>

The instance must also be the same instance as the community the bot will be protecting. This means, for example, @bouncer@<span>lemmy</span>.ml can protect !safeplace@<span>lemmy</span>.ml, but not !safeplace@<span>lemmy</span>.world.

#### `USERNAME`
The username of your bouncer bot.

#### `PASSWORD`
The password for your bouncer bot's account.

#### `DB_FILE`
The path to a sqlite database file that will be used to store the user allow-list and other information needed to run the bot. E.g. `db.sqlite3`.

#### `COMMUNITY`
The name of the community the bouncer bot should protect. If the webfinger for your community is !safe@<span>place</span>.xyx, the correct name to use is "safe".

#### `FEDERATED_INSTANCE_ALLOWLIST`
Space separated list of federated instances that users can post from without needing to be manually vetted or added to the user allow-list.

Your `.env` file should end up looking something like this:
```
LOCAL_INSTANCE = lemmy.ml
USERNAME = bouncer
PASSWORD = mySecurePassword
DB_FILE = db.sqlite3
COMMUNITY = safe
FEDERATED_INSTANCE_ALLOWLIST = lemm.ee midwest.social startrek.website
```

## Using your bot

### Running your bot
Start your bot by running `npm run start` (or equivalent for other package managers).

Once you start running your bot, posts and comments from non-allowed users in your community will:
1. Be replied to by the bouncer to explain why the post/comment is being removed
2. Report the content with a reason saying that the post/comment needs to be vetted
3. Remove the post/comment with a reason similar to the one in step 2

Some bare-bones templates for a Dockerfile and a systemd unit file can be found [here](https://github.com/SleeplessOne1917/lemmy-bot/tree/main/templates).

### Adding users to allow list
To add users to the user allow-list, privately message the bouncer with mentions of the accounts being added. It will message you back once it is finished adding them to tell you the results of your addition. If someone who isn't a moderator of the protected community privately messages the bouncer, it will not respond at all.

A message you might send to the bouncer:

> Add @nice@<span>lemmy</span>.world, @good@<span>hexbear</span>.net, and @wholesome@<span>forum.</span><span>basedcount</span>.com please!

The precise wording doesn't matter: all that matters is that each person you want to add to the allow-list is specified in the format @person@<span>instance</span>.
