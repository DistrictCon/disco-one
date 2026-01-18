require('dotenv').config({ override: true })
const fs = require('fs')
const pg = require('pg')

process.env.LOG_LEVEL = (process.argv[2] === 'debug') ? 'debug' : 'info'

const logger = require('../util/logger')(process.env.LOG_LEVEL)
const { User, Submission } = require('../db/models/app-models')
// Order matters here for the FK constraints
const models = [ User, Submission ]

if (require.main !== module) {
    console.error('This script can only be run from the CLI.')
    process.exit(0)
}

;(async () => {
    logger.debug('Opening database connection for seeding')

    let client = null
    try {
        client = new pg.Client(process.env.DATABASE_URL)
        await client.connect()
    } catch(err) {
        logger.error('Unable to establish connection to database')
        process.exit(1)
    }

    const userMap = {}
    const tracker = {}

    for (let i=0; i<models.length; ++i) {
        const tableName = models[i].getTableName()
        
        let data = null
        try {
            data = fs.readFileSync(`./db/seeds/${tableName}.dump`).toString()
        } catch(err) {
            if (/ENOENT/.test(err.message)) {
                logger.info(`No seed data file for ${tableName}`)
            } else {
                logger.warn(`Unable to read seed data file for ${tableName}: ${err.message || err.toString()}`)
            }
            continue
        }
        if (!data) {
            logger.warn(`No seed data found in seed file for ${tableName}`)
            continue
        }

        const rows = data.split('\n').map(line => line.split('|'))
        if (rows.length < 2) {
            logger.warn(`No data rows found in seed file for ${tableName}`)
            continue
        }

        try {
            await client.query(`DELETE FROM "${tableName}";`)
            logger.info(`Deleted all existing ${tableName} records`)
        } catch(err) {
            logger.warn(`Unable to delete all ${tableName} records, attempting to seed anyway: ${err.message || err.toString()}`)
        }

        logger.info(`Seeding data for ${tableName}`)
        tracker[tableName] = 0

        const fields = [...rows[0].map(f => `"${f}"`)]
        if (!fields.includes('"createdAt"')) {
            fields.push('"createdAt"')
        }
        if (!fields.includes('"updatedAt"')) {
            fields.push('"updatedAt"')
        }

        for (let j=1; j<rows.length; ++j) {
            if (rows[j].length !== rows[0].length) {
                if (rows[j].join('').length > 0) {
                    logger.warn(`Skipping malformed line in ${tableName} seed: ${rows[j].join('|')}`)
                }
                continue
            }
            
            let associatedUser = null
            const values = [...rows[j].map((v, fi) => {
                const fieldType = models[i].getAttributes()[fields[fi].replaceAll('"', '')]?.type.toString().toLowerCase()
                if (v === 'null') {
                    return 'null'
                } if (fieldType === 'integer' || fieldType === 'boolean') {
                    return v
                } else if (tableName === 'Users' && fields[fi] === '"password"') {
                    return `'${User.hashPass(v)}'`
                } else if (fields[fi] === '"UserId"' && userMap[v]) {
                    associatedUser = userMap[v]
                    return `'${userMap[v].id}'`
                } else if (fieldType === 'timestamp with time zone') {
                    if (!v) {
                        return 'NOW()'
                    } else {
                        const dir = v[0]
                        const amount = Number(v.substring(1)) * (1000 * 60)
                        if ((dir !== '+' && dir !== '-') || !amount) {
                            logger.warn(`unable calculate time diff for row ${j}, ${fields[fi]}: ${v}`)
                            return 'NOW()'
                        }
                        if (tableName === "Users") {
                            d = Date.now() + amount
                            return `'${(new Date(d)).toISOString()}'`
                        } else {
                            let d = null
                            if (dir === '+') {
                                d = associatedUser.createTime.getTime() + amount
                            } else {
                                d = associatedUser.createTime.getTime() - amount
                            }
                            return `'${(new Date(d)).toISOString()}'`
                        }
                    }
                } else {
                    return `'${v}'`
                }
            })]

            const query = `INSERT INTO "${tableName}" (${fields.join(', ')}) VALUES (${values.join(', ')}) RETURNING *;`
            logger.debug(`Executing seed INSERT query: ${query}`)
            try {
                const result = await client.query(query)
                tracker[tableName]++
                if (tableName === 'Users') {
                    userMap[result.rows[0].username] = {
                        id: result.rows[0].id,
                        createTime: new Date(result.rows[0].createdAt)
                    }
                    logger.debug(`Added ${result.rows[0].username} to userMap`)
                }

            } catch(err) {
                logger.warn(`INSERT query failed for seed row ${j} in ${tableName}: ${err.message || err.toString()}`)
                continue
            }
        }
    }

    await User.validateAllScores()
    logger.info('Updated all User scores')

    await client.end()
    logger.debug('Closed database connection for seeding')

    const result = Object.keys(tracker).map(t => {
        return `${tracker[t]} ${t} rows written`
    })
    logger.info(`Script complete: ${result.join(', ')}`)
    return Promise.resolve()
})();
