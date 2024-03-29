import { bot } from './src/bot';
import { setupDB } from './src/db';
import { config } from 'dotenv';
import { initInstanceAllowlist } from './src/utils';

config();

async function start() {
    initInstanceAllowlist();
    await setupDB();

    bot.start();
}

start();
