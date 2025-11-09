const { DataTypes } = require('sequelize')
const User = require('./User')
const Submission = require('./Submission')
const { getConnection } = require('../../util/database')

const sequelize = getConnection()

const Queue = sequelize.define(
    'Queue',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
    },
    {
        tableName: 'Queue',
        updatedAt: false
    }
)

User.Queue = User.hasOne(Queue, { foreignKey: { allowNull: false } })
Submission.Queue = Submission.hasOne(Queue, { foreignKey: { allowNull: false } })
module.exports = Queue
