const crypto = require('crypto')
const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')
const patterns = require('../patterns.json')

const sequelize = getConnection()

const User = sequelize.define(
    'User',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        score: { type: DataTypes.INTEGER, allowNull: false , defaultValue: 0 },
        isAdmin: { type: DataTypes.BOOLEAN, allowNull: false , defaultValue: false }
    },
    {
        timestamps: true
    }
)

User.hashPass = function hashPass(pass) {
    return crypto.createHash('sha256').update(`${pass}-${process.env.SALT}`).digest('hex')
}
User.cleanUsername = function cleanUsername(username) {
    return username.trim().replaceAll(/[^\w\-\.\']/ig, '').substring(0, 255)
}

User.validateAllScores = async function validateAllScores() {
    // TODO: go through all User records and validate all scores
    //       this will potentially update all user records!
}

User.prototype.checkScore = async function checkScore() {
    let score = (await this.getSubmissions()).reduce((p, c) => {
        if (c.executedAt && patterns[c.pattern]) {
            return p + patterns[c.pattern].points
        }
        return p
    }, 0)

    return score
}

module.exports = User
