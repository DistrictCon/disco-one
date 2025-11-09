require('dotenv').config({ override: true })
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const { getConnection } = require('../util/database')
const User = require('./models/User')
const Pattern = require('./models/Pattern')
const Submission = require('./models/Submission')
const Queue = require('./models/Queue')

;(async () => {
    if (process.env.NODE_ENV !== 'development') {
        return Promise.reject(new Error('DO NOT run this in any environment but development!'))
    }

    console.log('Forcing sync of all sequelize models...')

    const sequelize = getConnection()
    await sequelize.sync({ force: true, logging: m => logger.debug(m) })

    console.log('Finished initializing database!')
    return Promise.resolve()
})();
