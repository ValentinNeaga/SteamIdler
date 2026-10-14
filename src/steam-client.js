const steamUser = require("steam-user");
const consoleHelper = require("./helpers/console");

const STARTUP_DELAY = 5000;
const KICKED_RECONNECT_DELAY = 10000;
const RETRY_BASE_DELAY = 30000;
const RETRY_MAX_DELAY = 600000;

const FATAL_ERRORS = [
    steamUser.EResult.InvalidPassword,
    steamUser.EResult.AccessDenied,
    steamUser.EResult.Banned,
    steamUser.EResult.AccountNotFound,
    steamUser.EResult.Revoked,
    steamUser.EResult.Expired,
    steamUser.EResult.AccountDisabled,
    steamUser.EResult.AccountLockedDown,
];

/**
 * Log an account on to Steam and idle its games while no other session of the account is playing.
 *
 * @param {{name: string, refreshToken: string, games: Array<number|string>, invisible: boolean}} account
 * @param {{resumeDelay: number}} options The resume delay is in milliseconds.
 * @returns {{stop: Function}}
 */
module.exports = function (account, options) {
    const log = consoleHelper.scope(account.name);

    const client = new steamUser({
        dataDirectory: './data',
        machineIdType: steamUser.EMachineIDType.PersistentRandom,
    });

    let idling = false;
    let blocked = false;
    let kicked = false;
    let stopped = false;
    let retries = 0;
    let resumeTimer = null;
    let logOnTimer = null;

    const cancelResume = () => {
        clearTimeout(resumeTimer);
        resumeTimer = null;
    };

    const reset = () => {
        cancelResume();
        idling = false;
        blocked = false;
    };

    const resume = delay => {
        cancelResume();

        resumeTimer = setTimeout(() => {
            resumeTimer = null;

            if (stopped || idling || !client.steamID || client.playingState.blocked) return;

            client.gamesPlayed(account.games);
            idling = true;
            kicked = false;

            log.info(`Idling ${account.games.join(', ')}.`);
        }, delay);
    };

    const logOn = delay => {
        clearTimeout(logOnTimer);

        logOnTimer = setTimeout(() => {
            logOnTimer = null;

            if (stopped || client.steamID) return;

            client.logOn({ refreshToken: account.refreshToken });
        }, delay);
    };

    client.on('loggedOn', () => {
        if (stopped) return;

        retries = 0;
        reset();
        resume(kicked ? options.resumeDelay : STARTUP_DELAY);
    });

    client.on('accountInfo', name => {
        const personaState = account.invisible ? steamUser.EPersonaState.Invisible : steamUser.EPersonaState.Online;

        client.setPersona(personaState);

        log.info(`Logged on as ${name} (${account.invisible ? 'invisible' : 'online'}).`);
    });

    client.on('playingState', (isBlocked, playingApp) => {
        if (stopped) return;

        if (isBlocked) {
            cancelResume();
            idling = false;

            if (blocked) return;

            blocked = true;

            if (!playingApp) return log.warn('A game is running in another session. Idling paused.');

            return client.getProductInfo([playingApp], [], (error, apps) => {
                const app = !error && apps[playingApp] && apps[playingApp].appinfo;
                const name = app && app.common ? app.common.name : `App ${playingApp}`;

                log.warn(`${name} is running in another session. Idling paused.`);
            });
        }

        if (!blocked) return;

        blocked = false;

        log.info(`Game closed in the other session. Resuming in ${options.resumeDelay / 1000}s.`);

        resume(options.resumeDelay);
    });

    client.on('error', error => {
        reset();

        if (stopped) return;

        if (FATAL_ERRORS.includes(error.eresult)) {
            clearTimeout(logOnTimer);

            return log.error(`Logon failed (${error.message}). Account stopped. If the refresh token is no longer valid, run "npm run add-account" and log in with this account.`);
        }

        if (error.eresult === steamUser.EResult.LoggedInElsewhere) {
            kicked = true;

            log.warn(`Session taken over by another client. Reconnecting in ${KICKED_RECONNECT_DELAY / 1000}s.`);

            return logOn(KICKED_RECONNECT_DELAY);
        }

        const delay = Math.min(RETRY_BASE_DELAY * Math.pow(2, retries), RETRY_MAX_DELAY);

        retries++;

        log.error(`${error.message}. Reconnecting in ${delay / 1000}s.`);

        logOn(delay);
    });

    client.on('disconnected', (eresult, message) => {
        reset();

        if (stopped) return;

        log.warn(`Disconnected from Steam (${message || eresult}). Reconnecting...`);
    });

    logOn(0);

    return {
        stop: () => {
            stopped = true;

            reset();
            clearTimeout(logOnTimer);

            if (client.steamID) client.logOff();
        },
    };
};
