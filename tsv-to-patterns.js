
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
    const filename = process.argv[2] || '/mnt/c/Users/me/Downloads/patterns.tsv'
    const lines = fs.readFileSync(filename).toString().split('\n')
    const patterns = {}
    lines.filter(line => {
        const fields = line.split('\t')
        return(Number(fields[0]) && fields[2] && fields[4])
    })
    .forEach(line => {
        const fields = line.split('\t')
        patterns[fields[2]] = {
            points: Number(fields[0]),
            path: fields[5]?.replace('\r', '') || null,
            hint: fields[4].replace('\r', ''),
            note: fields[1]?.replace('\r', '') || ''
        }
    })
    fs.writeFileSync(path.join(__dirname, 'db', 'patterns.json'), JSON.stringify(patterns, null, 4))
    console.log(`Wrote ${Object.keys(patterns).length} patterns to file.\n`)

} catch(err) {
    console.error(err)
    process.exit(1)
}