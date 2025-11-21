const { DataTypes } = require('sequelize')
const Submission = require('./Submission')
const { getConnection } = require('../../util/database')

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

User.validateAllScores = async function validateAllScores() {
    // TODO: go through all User records and validate all scores
    //       this will potentially update all user records!
}

User.prototype.validateScore = async function validateScore() {
    // TODO: go through all executed submissions and call getPatternPoints
    //       if score differs, update record
    //       return validated score
    return 0
}

User.Submissions = User.hasMany(Submission)
module.exports = User
