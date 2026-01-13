
const fs = require('fs')
const path = require('path')

// The tab-separated file can be passed in as the only argument:
// node tsv-to-patterns.js [filepath]
//
// The file itself should have 6 columns:
// points    note    pattern    comments    hint    path
//
// The "comments" are not used in this server


try {
    const PATTERN_REGEX = /^[rgboyz0-79]+$/i
    const filename = process.argv[2] || '/mnt/c/Users/me/Downloads/patterns.tsv'
    const lines = fs.readFileSync(filename).toString().split('\n')
    const patterns = {}
    console.log(`\nReading and filtering ${lines.length} lines...`)
    lines.filter(line => {
        const fields = line.split('\t')
        const valid = (Number(fields[0]) && fields[2] && fields[4])
        if (!valid) {
            let reason = 'no hint'
            if (!Number(fields[0])) {
                reason = `bad points ("${fields[0]}")`
            } else if (!PATTERN_REGEX.test(fields[2])) {
                reason = `bad pattern (${fields[2] || 'blank'})`
            }
            console.log(`  invalid pattern: ${reason}`)
        }
        return valid
    })
    .forEach(line => {
        const fields = line.split('\t')
        patterns[fields[2]] = {
            points: Number(fields[0]),
            path: fields[5]?.replace('\r', '') || null,
            hint: fields[4].replace('\r', '').replaceAll('’', `'`),
            note: fields[1]?.replace('\r', '').replaceAll('’', `'`) || ''
        }
    })
    fs.writeFileSync(path.join(__dirname, 'db', 'patterns.json'), JSON.stringify(patterns, null, 4))
    const count = Object.keys(patterns).length
    console.log(`Wrote ${count} patterns to file.\n${lines.length - count} unusable lines.\n`)

} catch(err) {
    console.error(err)
    process.exit(1)
}