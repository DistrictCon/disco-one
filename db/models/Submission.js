const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')
const { getPathPoints } = require('../../util/patterns')
const patterns = require('../patterns.json')

const colorPerpendiculars = { R: 21, G: 10, B: 5, O: 23, Y: 23 }
const pointScale = [0, 5, 10, 15, 20, 25, 30, 40, 999]
const sequelize = getConnection()

const Submission = sequelize.define(
    'Submission',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        pattern: { type: DataTypes.STRING, allowNull: false },
        executedAt: { type: DataTypes.DATE, allowNull: true },
        resubmit: { type: DataTypes.BOOLEAN, allowNull: false , defaultValue: false },
        valid: { type: DataTypes.BOOLEAN, allowNull: false , defaultValue: false }
    }
)

Submission.getMaxPoints = function getMaxPoints() {
    return Object.keys(patterns).reduce((p, c) => patterns[c].points + p, 0)
}

Submission.prototype.getPoints = function getPoints() {
    return (patterns[this.pattern]) ? patterns[this.pattern].points : 0
}

Submission.prototype.isValid = function isValid() {
    return !!patterns[this.pattern]
}

Submission.prototype.getPatternInfo = function getPatternInfo() {
    return {
        pattern: this.pattern,
        createdAt: (new Date(this.createdAt)).getTime(),
        updatedAt: (new Date(this.updatedAt)).getTime(),
        executedAt: (this.executedAt) ? (new Date(this.executedAt)).getTime() : null,
        resubmit: this.resubmit,
        points: (patterns[this.pattern]) ? patterns[this.pattern].points : 0,
        hint: (patterns[this.pattern]) ? patterns[this.pattern].hint : null,
        scale: (patterns[this.pattern]) ? getPointScale(patterns[this.pattern].points) : 0
    }
}

function getPointScale(points=0) {
    for (let i=0; i<pointScale.length; ++i) {
        if (points < pointScale[i]) {
            return i
        }
    }
    return 1
}

Submission.isValid = function isValid(pattern) {
    return !!patterns[pattern]
}

Submission.prototype.getPath = function getPath() {
    if (patterns[this.pattern]) {
        if (patterns[this.pattern].path) {
            // pre-defined (manual) path entry
            return patterns[this.pattern].path
        } else {
            const points = getPathPoints(this.pattern.toUpperCase())
            if (!points) {
                // Good pattern, but unable to generate path!
                logger.warn(`Unable to retrieve path for otherwise good pattern: ${pattern}`)
                return Submission.getInvalidPath(this.pattern)
            } else {
                return points.join('-')
            }
        }
    } else {
        // Unrecognized pattern
        return Submission.getInvalidPath(this.pattern)
    }
}

Submission.getInvalidPath = function getInvalidPath(pattern) {
    // Find first valid color and flash the perpendicular path, then flash the edge lights as an error
    let color = pattern.match(/([rgybo])/i)
    color = ((color) ? color[1] : 'R').toUpperCase()
    return `${color}1-${colorPerpendiculars[color]}-ER3`
}

module.exports = Submission
