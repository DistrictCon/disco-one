const User = require('./User')
const Submission = require('./Submission')

Submission.belongsTo(User, { foreignKey: { allowNull: false } })
User.hasMany(Submission, { onDelete: 'cascade', hooks: true })

module.exports = { User, Submission }
