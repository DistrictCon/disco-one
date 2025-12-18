const User = require('./User')
const Submission = require('./Submission')

Submission.belongsTo(User, { foreignKey: { allowNull: false } })
User.hasMany(Submission)

module.exports = { User, Submission }
