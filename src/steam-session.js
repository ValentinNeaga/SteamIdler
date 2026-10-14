const consoleHelper = require('./helpers/console');
const { LoginSession, EAuthTokenPlatformType } = require('steam-session');

/**
 * Start a QR code login and resolve with the authenticated session.
 *
 * @returns {Promise<LoginSession>}
 */
module.exports = function () {
    return new Promise(async (resolve, reject) => {
        const session = new LoginSession(EAuthTokenPlatformType.SteamClient);

        session.on('authenticated', () => {
            return resolve(session);
        });

        session.on('remoteInteraction', () => {
            return consoleHelper.info('Code scanned! Please confirm the login request on the Steam Mobile Authenticator app.');
        });

        session.on('timeout', () => {
            return reject('Timed out. Please try again.');
        });

        session.on('error', error => {
            if (error.eresult === 9) return reject('Login cancelled from Steam Mobile Authenticator app. Please try again.');

            return reject(error);
        });

        let qrCodeData;

        try {
            qrCodeData = await session.startWithQR();
        } catch (error) {
            return reject(error);
        }

        consoleHelper.info('QR Code generated. Please scan it with the Steam Mobile Authenticator app.');
        consoleHelper.qrcode(qrCodeData.qrChallengeUrl);
    });
};
