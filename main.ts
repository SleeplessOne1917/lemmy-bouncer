import { bot } from './src/bot';
import { setupDB } from './src/db';

async function start() {
    await setupDB(process.env.DB_FILE);

    bot.start();
}

start();
