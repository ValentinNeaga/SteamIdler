const chalk = require('chalk');
const qrcodeTerminal = require('qrcode-terminal');
const asciiart = require('asciiart-logo');
const packageInfo = require("../../package.json");

const format = message => {
    if (Object.prototype.toString.call(message) === "[object Error]") return message.message;

    return message;
};

module.exports.success = message => {
    return console.log(`[${chalk.green('SUCCESS')}] ${chalk.green(format(message))}`);
};

module.exports.error = message => {
    return console.log(`[${chalk.red('ERROR')}] ${chalk.red(format(message))}`);
};

module.exports.info = message => {
    return console.log(`[${chalk.blue('INFO')}] ${chalk.blue(format(message))}`);
};

module.exports.warn = message => {
    return console.log(`[${chalk.yellow('WARN')}] ${chalk.yellow(format(message))}`);
};

module.exports.debug = message => {
    return console.log(`[${chalk.gray('DEBUG')}] ${chalk.gray(format(message))}`);
};

/**
 * Create a logger that prefixes every message with the given name.
 *
 * @param {string} name
 * @returns {{success: Function, error: Function, info: Function, warn: Function, debug: Function}}
 */
module.exports.scope = name => {
    const prefix = message => `[${name}] ${format(message)}`;

    return {
        success: message => module.exports.success(prefix(message)),
        error: message => module.exports.error(prefix(message)),
        info: message => module.exports.info(prefix(message)),
        warn: message => module.exports.warn(prefix(message)),
        debug: message => module.exports.debug(prefix(message)),
    };
};

module.exports.clear = () => {
    return console.clear();
};

module.exports.qrcode = data => {
    return qrcodeTerminal.generate(data, { small: true });
};

module.exports.boot = () => {
    console.log(asciiart({
        name: 'Steam Idler',
        font: 'Standard',
        borderColor: 'grey',
        logoColor: 'lime',
        textColor: 'white',
    })
        .right(`v${packageInfo.version}`)
        .right(`by ${packageInfo.author}`)
        .emptyLine()
        .center(packageInfo.description)
        .render()
    );
};
