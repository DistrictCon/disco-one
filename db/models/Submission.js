const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')

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

Submission.prototype.getPoints = async function getPoints() {
    // TODO: check against Pattern, return 0 if invalid pattern
    return 0
}

module.exports = Submission
