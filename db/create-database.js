require('dotenv').config({ override: true })
const pg = require('pg')
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

    console.log('Creating express session table')

    const client = new pg.Client(process.env.DATABASE_URL)
    await client.connect()
    const dropSessions = `DROP TABLE IF EXISTS "user_sessions" CASCADE;`
    const createSessions = `CREATE TABLE "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
    ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");`
    await client.query(dropSessions)
    await client.query(createSessions)
    await client.end()

    console.log('Finished initializing database!')
    return Promise.resolve()
})();
