const logger = require('./logger')(process.env.LOG_LEVEL)
const AppError = require('./AppError')

module.exports = {
    checkUserAuth,
    checkAdminAuth
}

function checkUserAuth(req, res, next) {
    if (!req.session.user) {
        const ip = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
        logger.info(`Attempt to hit restricted route when not logged in (${req.path}) from ${ip}`)
        return next(new AppError('You must be logged in.', 401))
    }
    next()
}

function checkAdminAuth(req, res, next) {
    if (!req.session.user) {
        const ip = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
        logger.info(`Attempt to hit ADMIN route when not logged in (${req.path}) from ${ip}`)
        return next(new AppError('You must be logged in.', 401))
    }
    if (!req.session.user.isAdmin) {
        const ip = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
        logger.info(`Attempt to hit ADMIN route when not an ADMIN (${req.path}) from ${ip} by ${req.session.user.username}`)
        return next(new AppError('You must be an admin to access this path.', 403))
    }
    next()
}
