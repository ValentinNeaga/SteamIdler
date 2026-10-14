const fs = require('fs');
const path = require('path');
const defaultGames = require('./games');

const FILE = path.resolve('accounts.json');
const MAX_GAMES = 32;

module.exports.MAX_GAMES = MAX_GAMES;

/**
 * Read the account list from accounts.json.
 *
 * @returns {Array<{name: string, refreshToken: string, games?: Array<number|string>, invisible?: boolean}>}
 */
module.exports.load = () => {
    if (!fs.existsSync(FILE)) return [];

    const accounts = JSON.parse(fs.readFileSync(FILE, 'utf8'));

    if (!Array.isArray(accounts)) throw new Error('accounts.json must contain an array of accounts.');

    accounts.forEach((account, index) => {
        if (!account || typeof account.name !== 'string' || !account.name) throw new Error(`Account at index ${index} in accounts.json has no name.`);
        if (typeof account.refreshToken !== 'string' || !account.refreshToken) throw new Error(`Account "${account.name}" in accounts.json has no refresh token.`);
    });

    return accounts;
};

/**
 * Write the account list to accounts.json.
 *
 * @param {Array<object>} accounts
 * @returns {void}
 */
module.exports.save = accounts => {
    const temporary = `${FILE}.tmp`;

    fs.writeFileSync(temporary, `${JSON.stringify(accounts, null, 4)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, FILE);
};

/**
 * Add an account to the list, or update the account with the same name, and save the list.
 *
 * @param {Array<object>} accounts
 * @param {{name: string, refreshToken: string}} account
 * @returns {object} The stored account.
 */
module.exports.upsert = (accounts, account) => {
    const index = accounts.findIndex(existing => existing.name === account.name);

    if (index === -1) {
        accounts.push(account);
    } else {
        accounts[index] = Object.assign({}, accounts[index], account);
    }

    module.exports.save(accounts);

    return accounts[index === -1 ? accounts.length - 1 : index];
};

/**
 * Resolve the games an account idles. Falls back to src/games.json, removes invalid
 * entries and duplicates, and limits the list to the number of games Steam accepts.
 *
 * @param {{games?: Array<number|string>}} account
 * @returns {{games: Array<number|string>, invalid: Array<*>, skipped: Array<number|string>}}
 */
module.exports.games = account => {
    const source = Array.isArray(account.games) ? account.games : defaultGames;
    const isValid = game => (Number.isInteger(game) && game > 0) || (typeof game === 'string' && game.trim() !== '');

    const invalid = source.filter(game => !isValid(game));
    const unique = [...new Set(source.filter(isValid))];

    return {
        games: unique.slice(0, MAX_GAMES),
        invalid: invalid,
        skipped: unique.slice(MAX_GAMES),
    };
};
