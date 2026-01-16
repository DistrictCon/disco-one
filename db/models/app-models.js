const User = require('./User')
const Submission = require('./Submission')

Submission.belongsTo(User, { onDelete: 'CASCADE', hooks: true, foreignKey: { allowNull: false } })
User.hasMany(Submission, { onDelete: 'CASCADE', hooks: true })

module.exports = { User, Submission }
