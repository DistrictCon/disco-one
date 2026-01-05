const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')

const patterns = require('../patterns.json')
const colorPerpendiculars = { R: 21, G: 10, B: 5, O: 23, Y: 23 }
const sequelize = getConnection()

const Submission = sequelize.define(
    'Submission',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        pattern: { type: DataTypes.STRING, allowNull: false },
        executedAt: { type: DataTypes.DATE, allowNull: true },
        resubmit: { type: DataTypes.BOOLEAN, allowNull: false , defaultValue: false }
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
        badgePattern: (patterns[this.pattern]) ? patterns[this.pattern].badgePattern: null
    }
}

Submission.prototype.getPath = function getPath() {
    if (patterns[this.pattern]) {
        return patterns[this.pattern].path
    } else {
        // If this is an invalid path we'll show the first color found,
        // but only the perpendicular path, then flash the edge lights as an error
        let color = this.pattern.match(/([rgybo])/i)
        color = ((color) ? color[1] : 'R').toUpperCase()
        return `${color}1-${colorPerpendiculars[color]}-ER3`
    }
}

Submission.isValid = function isValid(pattern) {
    return !!patterns[pattern]
}

module.exports = Submission
