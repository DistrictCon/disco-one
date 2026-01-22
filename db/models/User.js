const crypto = require('crypto')
const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')
const patterns = require('../patterns.json')
const logger = require('../../util/logger')(process.env.LOG_LEVEL)

const sequelize = getConnection()

const User = sequelize.define(
    'User',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
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
    const users = await User.findAll({
        attributes: ['id', 'username', 'score'],
        include: { all: true, nested: true }
    })

    let updated = 0
    for (let i=0; i<users.length; ++i) {
        const checkScore = await users[i].checkScore(users[i].Submissions)
        if (users[i].score !== checkScore) {
            const oldScore = users[i].score
            users[i].score = checkScore
            await users[i].save()
            logger.info(`Score for ${users[i].username} modified during revalidation (${oldScore} => ${checkScore})`)
            updated++
        }
    }

    return { total: users.length, updated }
}

User.prototype.checkScore = async function checkScore(subs = null) {
    if (!subs) {
        subs = await this.getSubmissions()
    }
    let score = subs.reduce((p, c) => {
        if (c.executedAt && patterns[c.pattern]) {
            return p + patterns[c.pattern].points
        }
        return p
    }, 0)

    return score
}

module.exports = User
