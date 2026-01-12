
const { getPathPoints, pathMap } = require('./util/patterns')
const patterns = require('./db/patterns.json')


/***************************************/
const DEBUG = process.argv[2] === 'debug' || false
validatePoints()
validatePathGeneration()
/***************************************/


function validatePoints() {
    console.log('\n*** VALIDATING PATH MAP POINTS AND DIRECTIONS')
    let counts = [0, 0]
    Object.keys(pathMap).forEach(loc => {
        Object.keys(pathMap[loc]).forEach(dir => {
            let opp = getOppositeDir(dir)
            if (!opp) {
                const match = (''+dir).match(/^(9?)([1-7])(0+)/)
                if (!match) { return console.log(`unable to determine opposite direction: ${dir}`) }
                if (match[1]) {
                    opp = getOppositeDir(match[1]+match[2]) + match[3]
                } else {
                    opp = getOppositeDir(match[2]) + match[3]
                }
            }

            if (''+pathMap[pathMap[loc][dir]][opp] !== ''+loc) {
                counts[1]++
                console.log(`path mismatch:\n  ${loc} -> ${dir} = ${pathMap[loc][dir]}\n  ${pathMap[loc][dir]} -> ${opp} = ${pathMap[pathMap[loc][dir]][opp]}`)
            } else {
                counts[0]++
                if (DEBUG) {
                    console.log(`Validated ${loc} -> ${dir} = ${pathMap[loc][dir]} and ${pathMap[loc][dir]} -> ${opp} = ${pathMap[pathMap[loc][dir]][opp]}`)
                }
            }
        })
    })
    console.log(`*** Validated pathways for ${Object.keys(pathMap).length} points, ${counts[0]} valid; ${counts[1]} invalid\n`)
}
function getOppositeDir(dir) {
    dir = ''+dir
    let opp = null
    if (/^9[2-6]$/.test(dir)) { opp = dir[1] }
    else if (/^[2-6]$/.test(dir)) { opp = '9'+dir }
    else if (Number(dir) === 1) { opp = 7 }
    else if (Number(dir) === 7) { opp = 1 }
    return opp
}


function validatePathGeneration() {
    let counts = [0, 0]
    console.log('\n*** VALIDATING PATH GENERATION FOR ALL PATTERNS')
    Object.keys(patterns).forEach(p => {
        const path = patterns[p].path || getPathPoints(p)
        if (!path) {
            counts[1]++
            console.warn(`  Pattern Note: ${patterns[p].note}`)
        } else {
            counts[0]++
            if (DEBUG) {
                console.log(`  Pattern: ${p}\n    => ${(Array.isArray(path)) ? path.join('-') : path}`)
            }
        }
    })
    console.log(`*** Validated paths for ${Object.keys(patterns).length} patterns, ${counts[0]} valid; ${counts[1]} invalid\n`)
}
