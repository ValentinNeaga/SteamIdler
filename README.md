<p align="center">
    <a href="https://github.com/JakyeRU/Larascord" target="_blank">
        <img src="https://raw.githubusercontent.com/JakyeRU/SteamIdler/main/.github/logos/Steam Idler-logos_transparent.png" height=200>
    </a>
</p>

<p align="center">
    <img src="https://img.shields.io/github/v/release/jakyeru/steamidler?color=blue&style=for-the-badge" alt="release">
</p>

# About Steam Idler
Steam Idler is a simple, light program that allows you to idle Steam games without having to keep the Steam client open. It is written in JavaScript and uses Node.js.

# Getting Started
## Prerequisites
- [Node.js](https://nodejs.org/en/download/)
- [Git](https://git-scm.com/downloads)
- [Steam Mobile](https://play.google.com/store/apps/details?id=com.valvesoftware.android.steam.community) (because you need to scan a QR code to log in)

## Installation
1. Clone the repository
```bash
git clone https://github.com/JakyeRU/SteamIdler.git
cd SteamIdler
```

2. Install dependencies
```bash
npm install
```

3. Run the program
```bash
node src/index.js
```

`npm start` also works, but it keeps an additional npm process running (around 60 MB of memory). Run `node src/index.js` directly to avoid it.

# Usage
When the program starts without any configured account, it displays a QR code. Scan it with the Steam Mobile app to log in. The account is saved to `accounts.json` and idling starts immediately.

![](.github/images/qr.png)

## Adding Accounts
All accounts run in a single process. To add another account, run:
```bash
npm run add-account
```

Running the command again for an account that already exists replaces its refresh token and keeps its other settings. Use it when a refresh token expires.

## Playing While Idling
When you launch a game on another device, Steam asks whether to continue launching and disconnect the other session. After you confirm, the idler reconnects without launching any games and waits. Once no game is running in the other session for `RESUME_DELAY` seconds, the idler resumes.

# Configuration
## Accounts
Accounts are stored in `accounts.json` in the project root. The file is created by `npm run add-account` and is excluded from git. See `accounts.example.json` for the format.

```json
[
    {
        "name": "main",
        "refreshToken": "...",
        "games": [381210, 1332010],
        "invisible": false
    },
    {
        "name": "second",
        "refreshToken": "...",
        "games": [105600]
    }
]
```

| Key | Description |
| --- | --- |
| `name` | Label used in the console output. Defaults to the Steam account name. |
| `refreshToken` | Refresh token obtained from the QR code login. |
| `games` | App IDs to idle. Optional. When omitted, the games in `src/games.json` are used. A string is shown as a non-Steam game. Steam accepts up to 32 games per account. |
| `invisible` | Sets the persona state to invisible. Optional. When omitted, `INVISIBLE_MODE` is used. |

## Environment
The `.env` file contains settings that apply to all accounts.

| Key | Default | Description |
| --- | --- | --- |
| `INVISIBLE_MODE` | `false` | Default persona state for accounts without an `invisible` value. |
| `RESUME_DELAY` | `60` | Seconds to wait after a game closes in another session before idling resumes. |
| `LOGIN_INTERVAL` | `5` | Seconds between account logins at startup. Logging in many accounts at once can trigger Steam rate limits. |

## Upgrading From a Single Account
If `accounts.json` does not exist and `.env` contains a `REFRESH_TOKEN`, the token is moved to `accounts.json` as an account named `default` on the next start. The games in `src/games.json` remain the default game list.

# License
This project is licensed under the **Apache-2.0 License** - see the [LICENSE](LICENSE) file for details.
