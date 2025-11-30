const { DataTypes } = require('sequelize')
const { getConnection } = require('../../util/database')

const sequelize = getConnection()

// We cache all valid patterns the first time they are requested
let allPatterns = null

const Pattern = sequelize.define(
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

Pattern.isValid = async function isValid(pattern) {
    if (!allPatterns) {
        allPatterns = await Pattern.findAll({ raw: true })
    }
    return !!allPatterns.filter(p => p.pattern === pattern).length
}

module.exports = Pattern
