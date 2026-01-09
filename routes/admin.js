const express = require('express')
const router = express.Router()
const { Submission, User } = require('../db/models/app-models')
const { checkAdminAuth } = require('../util/middleware')
const logger = require('../util/logger')(process.env.LOG_LEVEL)


router.get('/', checkAdminAuth, async (req, res) => {
    const userData = await User.findAll({
        attributes: ['id', 'username', 'score', 'isAdmin'],
        order: [ ['username', 'ASC'] ],
        include: { all: true, nested: true }
    })

    const users = userData.map(user => {
        const validSubmissions = user.Submissions.reduce((p, c) => { return p + ((c.isValid()) ? 1 : 0) }, 0)
        return {
            id: user.id,
            username: user.username,
            score: user.score,
            submissions: [ validSubmissions, user.Submissions.length - validSubmissions ],
            isAdmin: user.isAdmin
        }
    })

    const message = req.session.message || null
    req.session.message = null

    res.render('admin', {
        page: 'admin',
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || '',
        user: req.session.user,
        maxScore: Submission.getMaxPoints(),
        message,
        users
    })
})

router.get('/validate', checkAdminAuth, async (req, res, next) => {
    try {
        const counts = await User.validateAllScores()

        logger.info(`User ${req.session.user.username} just revalidated all User scores (modified ${counts.updated} out of ${counts.total} total).`)

        res.json(counts)

    } catch(err) {
        logger.warn('Unable to validate all scores: ' + err.message || err.toString())
        return next(err)
    }
})


module.exports = router
