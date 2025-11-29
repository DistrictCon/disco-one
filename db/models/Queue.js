const { DataTypes } = require('sequelize')
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

module.exports = Queue
