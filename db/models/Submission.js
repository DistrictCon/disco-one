const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')

const patterns = require('../patterns.json')
const colorPerpendiculars = { r: 21, b: 5, g: 10, o: 23, y: 23 }
const sequelize = getConnection()

const Submission = sequelize.define(
    'Submission',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        pattern: { type: DataTypes.STRING, allowNull: false },
        executedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
        updatedAt: false
    }
)

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
        executedAt: (this.executedAt) ? (new Date(this.executedAt)).getTime() : null,
        points: (patterns[this.pattern]) ? patterns[this.pattern].points : 0,
        hint: (patterns[this.pattern]) ? patterns[this.pattern].hint : null,
        badgePattern: (patterns[this.pattern]) ? patterns[this.pattern].badgePattern: null
    }
}

Submission.prototype.getPath = function getPath() {
    if (patterns[this.pattern]) {
        return patterns[this.pattern].path
    } else {
        // If this is an invalid path we'll show the first color in it for 2 seconds, but only the perpendicular path
        let color = this.pattern.match(/([rgybo])/i)
        color = (color) ? color[1] : 'R'
        return `${color.toUpperCase()}2-${colorPerpendiculars[color]}`
    }
}

Submission.isValid = function isValid(pattern) {
    return !!patterns[pattern]
}

module.exports = Submission
