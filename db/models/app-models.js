const User = require('./User')
const Submission = require('./Submission')
const Pattern = require('./Pattern')

Submission.belongsTo(User, { foreignKey: { allowNull: false } })
User.hasMany(Submission)

module.exports = { User, Submission, Pattern }
