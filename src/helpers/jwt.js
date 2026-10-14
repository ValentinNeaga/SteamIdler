module.exports.getExpiration = (token) => {
    token = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

    const now = new Date();
    const expires = new Date(token.exp * 1000);

    return {
        expires: expires,
        expired: expires < now,
        expiresInDays: Math.floor((expires - now) / 1000 / 60 / 60 / 24),
        expiresInHours: Math.floor((expires - now) / 1000 / 60 / 60),
        expiresInMinutes: Math.floor((expires - now) / 1000 / 60),
        expiresInSeconds: Math.floor((expires - now) / 1000),
        expiresInMilliseconds: expires - now,
    };
};

module.exports.getSubject = (token) => {
    try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8')).sub;
    } catch (error) {
        return null;
    }
};
