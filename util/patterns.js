
const logger = require('./logger')(process.env.LOG_LEVEL)

const pathMap = {
    R: { 1:2, 2:4, 3:12, 4:21, 5:11, 6:3, 7:1 },
    G: { 1:9, 2:16, 10:10, 3:13, 4:'B', 94:5, 95:6, 96:7 },
    B: { 1:22, 7:21, 70:29, 94:'G', 940:5, 95:15 },
    O: { 3:10, 4:23, 5:14 },
    Y: { 4:27, 6:26, 7:23, 92:19, 94:20 },
    1: { 1:'R', 10:2, 4:3, 40:11 },
    2: { 4:4, 40:12, 7:'R', 70:1 },
    3: { 1:4, 2:12, 4:11, 94:1, 96:'R' },
    4: { 4:12, 6:11, 7:3, 92:'R', 94:2 },
    5: { 1:6, 10:7, 4:'G', 40:'B' },
    6: { 1:7, 2:9, 4:13, 20:14, 3:16, 4:13, 5:'G', 7:5 },
    7: { 2:10, 3:14, 5:13, 6:'G', 7:6, 70:5 },
    8: { 4:18, 5:23, 6:10, 60:14 },
    9: { 1:10, 2:14, 4:16, 40:31, 6:13, 7:'G', 92:6, 96:28 },
    10: { 5:17, 6:14, 7:9, 70:'G', 92:7, 93:'O', 96:8 },
    11: { 1:12, 3:21, 94:3, 940:1, 95:'R', 96:4 },
    12: { 5:21, 7:11, 92:3, 93:'R', 94:4, 940:2 },
    13: { 1:14, 10:30, 93:'G', 94:6, 95:7, 96:9, 960:28 },
    14: { 1:30, 7:13, 92:9, 920:6, 93:7, 94:28, 95:'O', 96:10, 960:8 },
    15: { 1:16, 2:31, 10:17, 100:18, 4:22, 5:'B' },
    16: { 1:17, 10:18, 4:31, 7:15, 92:'G', 93:6, 94:9, 95:28 },
    17: { 1:18, 2:25, 6:31, 7:16, 70:15, 95:10 },
    18: { 7:17, 70:16, 700:15, 94:8 },
    19: { 1:20, 2:'Y', 3:27, 4:26 },
    20: { 4:'Y', 40:27, 5:26, 6:25, 7:19 },
    21: { 1:'B', 7:29, 10:22, 93:11, 94:'R', 95:12 },
    22: { 7:'B', 70:21, 700:29, 94:15 },
    23: { 1:'Y', 94:'O', 95:8 },
    24: { 2:27, 4:25 },
    25: { 92:17, 94:24, 96:20 },
    26: { 1:27, 94:19, 95:20, 96:'Y' },
    27: { 7:26, 92:24, 93:19, 94:'Y', 940:20 },
    28: { 4:14, 5:16, 6:9, 60:13 },
    29: { 1:21, 10:'B', 100:22 },
    30: { 7:14, 70:13 },
    31: { 92:15, 94:16, 940:9, 96:17 }
}

module.exports = {
    pathMap,

    getPathPoints: function getPathPoints(pattern) {
        const lines = pattern.toUpperCase().match(/([RGBOY]+)([0-79]+)($|Z+)/g)
        if (!lines) {
            logger.warn('Invalid path for valid pattern:' + pattern)
            return null
        }

        const points = []
        for (let li=0; li<lines.length; ++li) {
            const line = lines[li]
            const parts = line.match(/([RGBOY]+)([0-79]+)($|Z+)/)
            points.push(parts[1][0] + parts[1].length)

            let i = 0
            while (i < parts[2].length) {
                let dir = parts[2][i]
                if (parts[2][i+1] === '0') {
                    dir += parts[2][++i]
                    if (parts[2][i+1] === '0') {
                        dir += parts[2][++i]
                    }
                } else if (dir === '9') {
                    dir += parts[2][++i]
                    if (parts[2][i+1] === '0') {
                        dir += parts[2][++i]
                    }
                }
                
                let lastPoint = points[points.length-1]
                if (/^[RGBOY]/.test(lastPoint)) {
                    lastPoint = lastPoint[0]
                }

                if (pathMap[lastPoint][dir]) {
                    points.push(''+pathMap[lastPoint][dir])
                } else {
                    logger.warn(`Invalid pattern path: ${parts[0]} (${lastPoint}->${dir}) from ${pattern}`)
                    return null
                }
                ++i
            }
            if (parts[3]) {
                points.push('Z' + parts[3].length)
            }
        }
        return points
    }
}