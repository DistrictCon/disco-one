require('dotenv').config({ override: true })
const fs = require('fs')
const pg = require('pg')

const User = require('./models/User')
const models = [
    User,
    require('./models/Pattern'),
    require('./models/Submission'),
    require('./models/Queue')
]

;(async () => {
    console.log('Opening database connection for seeding')

    const client = new pg.Client(process.env.DATABASE_URL)
    await client.connect()

    for (let i=0; i<models.length; ++i) {
        const tableName = models[i].getTableName()
        let data = null
        try {
            data = fs.readFileSync(`./db/seeds/${tableName}.dump`).toString()
        } catch(err) {
            if (/ENOENT/.test(err.message)) {
                console.log(`No seed data for ${tableName}`)
                continue
            } else {
                console.error(err)
                process.exit(1)
            }
        }
        if (!data) {
            console.log(`No seed data for ${tableName}`)
            continue
        }

        
        console.log(`Deleted all ${tableName} records`)
        await client.query(`DELETE FROM "${tableName}";`)


        console.log(`Seeding data for ${tableName}`)
        const rows = data.split('\n').map(line => line.split('|'))
        const fields = [...rows[0].map(f => `"${f}"`), '"createdAt"', '"updatedAt"']
        for (let j=1; j<rows.length; ++j) {
            if (rows[j].length !== rows[0].length) {
                console.log('Skipping malformed line:', rows[j])
                continue
            }
            const values = [...rows[j].map((v, fi) => {
                const fieldType = models[i].getAttributes()[fields[fi].replaceAll('"', '')]?.type.toString().toLowerCase()
                if (fieldType === 'integer' || fieldType === 'boolean') {
                    return v
                } else if (tableName === 'Users' && fields[fi] === '"password"') {
                    return `'${User.hashPass(v)}'`
                } else {
                    return `'${v}'`
                }
            }), 'NOW()', 'NOW()']
            const query = `INSERT INTO "${tableName}" (${fields.join(', ')}) VALUES (${values.join(', ')});`
            console.log(`EXECUTING: ${query}`)
            await client.query(query)
        }
    }

    console.log('Closing database connection for seeding')
    await client.end()

    console.log('Finished seeding database!')
    return Promise.resolve()
})();
