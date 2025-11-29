require('dotenv').config({ override: true })
const pg = require('pg')
const { User, Submission, Pattern } = require('../db/models/app-models')

// Force DB connection opening in Sequelize
const { getConnection } = require('../util/database')

const models = [ User, Submission, Pattern ]

;(async () => {
    if (process.env.NODE_ENV !== 'development') {
        return Promise.reject(new Error('DO NOT run this in any environment but development!'))
    }

    console.log('Forcing sync of all sequelize models...')
    const sequelize = getConnection()
    await sequelize.sync({ force: true, logging: m => console.debug(m) })

    
    console.log('Opening database connection')
    const client = new pg.Client(process.env.DATABASE_URL)
    await client.connect()

    
    console.log('Adding UUID extension to database')
    console.log('EXECUTING: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    
    console.log('Adding UUID auto generation to each model primary key')
    const template = 'ALTER TABLE "[TABLE NAME]" ALTER COLUMN id SET DEFAULT uuid_generate_v4();'
    for (let i=0; i<models.length; ++i) {
        const alterQuery = template.replace('[TABLE NAME]', models[i].getTableName())
        console.log(`EXECUTING: ${alterQuery}`)
        await client.query(alterQuery)
    }


    console.log('Creating express user session table')
    const dropSessions = `DROP TABLE IF EXISTS "user_sessions" CASCADE;`
    const createSessions = `CREATE TABLE "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
    ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");`
    console.log(`EXECUTING: ${dropSessions}`)
    await client.query(dropSessions)
    console.log(`EXECUTING: ${createSessions}`)
    await client.query(createSessions)
    

    console.log('Closing database connection for sessions')
    await client.end()


    console.log('Finished initializing database!')
    return Promise.resolve()
})();
