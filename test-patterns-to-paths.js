
const { getPathPoints } = require('./util/patterns')
const patterns = require('./db/patterns.json')

// This script runs through all patterns and confirms that they can be converted to paths
// (look for any [WARN] messages)

Object.keys(patterns).forEach(p => {
    if (patterns[p].path) {
        console.log(`    ${p} (predefined)\n    => ${patterns[p].path}`)
    } else {
        console.log(`    ${p}\n    => ${getPathPoints(p)?.join('-')}`)
    }
})
