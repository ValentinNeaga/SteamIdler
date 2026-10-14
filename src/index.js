const fs = require('fs');
const consoleHelper = require('./helpers/console');

consoleHelper.boot();

if (!fs.existsSync('./.env')) {
    consoleHelper.warn('No .env file found. Attempting to create one...');
    fs.copyFileSync('./.env.example', './.env');
    consoleHelper.success('Successfully created .env file.');
}

require('dotenv').config();

const accounts = require('./accounts');
const steamClient = require('./steam-client');
const jwt = require('./helpers/jwt');

const seconds = (value, fallback) => {
    const parsed = parseInt(value, 10);

    return (Number.isNaN(parsed) || parsed < 0 ? fallback : parsed) * 1000;
};

const settings = {
    invisible: process.env.INVISIBLE_MODE === 'true',
    resumeDelay: seconds(process.env.RESUME_DELAY, 60),
    loginInterval: seconds(process.env.LOGIN_INTERVAL, 5),
};

const censor = name => name.slice(0, name.length / 2.5) + name.slice(name.length / 2.5).replace(/./g, '*');

/**
 * Move the REFRESH_TOKEN from the .env file into accounts.json.
 *
 * @param {Array<object>} list
 * @returns {void}
 */
const migrateEnvToken = list => {
    if (list.length || !process.env.REFRESH_TOKEN) return;

    accounts.upsert(list, { name: 'default', refreshToken: process.env.REFRESH_TOKEN });

    const env = fs.readFileSync('./.env', 'utf8').split(/\r?\n/).filter(line => !/^\s*REFRESH_TOKEN\s*=/.test(line)).join('\n');

    fs.writeFileSync('./.env', env, { encoding: 'utf8' });

    consoleHelper.success('Moved REFRESH_TOKEN from the .env file to accounts.json as account "default".');
};

/**
 * Log in with a QR code and store the account in accounts.json.
 *
 * @param {Array<object>} list
 * @returns {Promise<object>}
 */
const addAccount = async list => {
    const session = await require('./steam-session')();

    const existing = list.find(account => jwt.getSubject(account.refreshToken) === String(session.steamID));
    const name = existing ? existing.name : session.accountName;

    const account = accounts.upsert(list, { name: name, refreshToken: session.refreshToken });

    consoleHelper.success(`Account ${censor(session.accountName)} saved to accounts.json. (SteamID: ${session.steamID})`);

    return account;
};

/**
 * Check the expiration of an account's refresh token.
 *
 * @param {{name: string, refreshToken: string}} account
 * @returns {boolean} Whether the token can be used to log on.
 */
const hasValidToken = account => {
    const log = consoleHelper.scope(account.name);
    let expiration;

    try {
        expiration = jwt.getExpiration(account.refreshToken);
    } catch (error) {
        log.error('Refresh token is malformed. Run "npm run add-account" and log in with this account.');
        return false;
    }

    if (expiration.expired) {
        log.error('Refresh token has expired. Run "npm run add-account" and log in with this account.');
        return false;
    }

    if (expiration.expiresInDays < 7) {
        log.warn(`Refresh token expires in ${expiration.expiresInDays} day(s). Run "npm run add-account" and log in with this account to renew it.`);
    }

    return true;
};

/**
 * Resolve the games of an account and report invalid or skipped entries.
 *
 * @param {object} account
 * @returns {Array<number|string>}
 */
const resolveGames = account => {
    const log = consoleHelper.scope(account.name);
    const { games, invalid, skipped } = accounts.games(account);

    if (invalid.length) log.warn(`Ignoring invalid games: ${invalid.map(game => JSON.stringify(game)).join(', ')}.`);
    if (skipped.length) log.warn(`Steam accepts up to ${accounts.MAX_GAMES} games per account. Ignoring: ${skipped.join(', ')}.`);

    return games;
};

const main = async () => {
    const command = process.argv[2];
    const list = accounts.load();

    migrateEnvToken(list);

    if (command === 'add') {
        await addAccount(list);
        return process.exit(0);
    }

    if (command) {
        consoleHelper.error(`Unknown command "${command}". Available commands: add.`);
        return process.exit(1);
    }

    if (!list.length) {
        consoleHelper.warn('No accounts found in accounts.json. Attempting to add one...');
        await addAccount(list);
    }

    const runnable = list
        .filter(hasValidToken)
        .map(account => ({
            name: account.name,
            refreshToken: account.refreshToken,
            games: resolveGames(account),
            invisible: typeof account.invisible === 'boolean' ? account.invisible : settings.invisible,
        }))
        .filter(account => {
            if (account.games.length) return true;

            consoleHelper.scope(account.name).warn('No games configured. Account skipped.');
            return false;
        });

    if (!runnable.length) {
        consoleHelper.error('No account can be started.');
        return process.exit(1);
    }

    consoleHelper.info(`Starting ${runnable.length} account(s).`);

    const clients = [];
    const timers = runnable.map((account, index) => setTimeout(() => {
        clients.push(steamClient(account, { resumeDelay: settings.resumeDelay }));
    }, index * settings.loginInterval));

    const shutdown = () => {
        consoleHelper.info('Logging off...');

        timers.forEach(clearTimeout);
        clients.forEach(client => client.stop());

        setTimeout(() => process.exit(0), 1000);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
};

main().catch(error => {
    consoleHelper.error(error);
    process.exit(1);
});
