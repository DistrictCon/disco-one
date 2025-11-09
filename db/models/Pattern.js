const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')

const sequelize = getConnection()

module.exports = sequelize.define(
    'Pattern',
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        pattern: { type: DataTypes.STRING, allowNull: false, unique: true },
        points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        hint: { type: DataTypes.TEXT, allowNull: false },
        badgePattern: { type: DataTypes.STRING, allowNull: true, unique: true }
    },
    {
        timestamps: true
    }
)
