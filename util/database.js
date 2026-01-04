const { Sequelize } = require('sequelize')
const AppError = require('./AppError')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

let connection = null

module.exports = {
    getConnection: () => {
        if (connection) { return connection }
        connection = new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            logging: m => logger.debug(m),
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false 
                }
            }
        })
        return connection
    },

    closeConnection: async () => {
        if (connection) {
            try {
                await connection.close()
                logger.info('Database connection closed.')
            } catch (err) {
                logger.error('Unable to close database connection:', err)
                return Promise.reject(new AppError('Unable to close database connection.', 500))
            }
        }
    }
}