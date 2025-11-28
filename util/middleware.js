const logger = require('./logger')(process.env.LOG_LEVEL)
const AppError = require('./AppError')

module.exports = {
    checkUserAuth,
    checkAPIAuth
}

function checkUserAuth(req, res, next) {
    if (!req.session.user) {
        const ip = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
        logger.debug(`Attempt to hit restricted route when not logged in (${req.path}) from ${ip}`)
        return next(new AppError('You must be logged in.', 401))
    }
    next()
}

function checkAPIAuth(req, res, next) {
    if (req.headers?.authorization !== process.env.API_KEY) {
        const ip = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
        logger.info(`Attempt to hit restricted API endpoint (${req.path}) with bad key from ${ip}`)
        return next(new AppError('You must have a valid API key.', 401))
    }
    next()
}
