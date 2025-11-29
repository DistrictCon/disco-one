const User = require('./User')
const Submission = require('./Submission')
const Pattern = require('./Pattern')
const Queue = require('./Queue')


Submission.belongsTo(User, { foreignKey: { allowNull: false } })
User.hasMany(Submission)

User.hasOne(Queue, { foreignKey: { allowNull: false } })
Submission.hasOne(Queue, { foreignKey: { allowNull: false } })

module.exports = { User, Submission, Queue, Pattern }
