const express = require('express')
const AppError = require('../util/AppError')
const { checkUserAuth, checkAPIAuth } = require('../util/middleware')
const { Op } = require('sequelize')
const { Submission, User } = require('../db/models/app-models')
const { getConnection } = require('../util/database')
const { PATTERN_REGEX } = require('../util/constants')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const router = express.Router()

router.get('/', async (req, res, next) => {
    const page = (req.session?.user) ? 'game' : 'home'

    res.setHeader('X-author', 'jakerella')

    const message = req.session.message || null
    req.session.message = null

    try {
        let user = null
        let patterns = []
        let failed = []
        let queued = null
        let queuePos = null
        
        if (req.session?.user) {
            user = await User.findOne({
                where: { id: req.session.user.id },
                include: Submission,
                order: [
                    [Submission, 'createdAt', 'DESC']
                ]
            })

            if (user) {
                patterns = user.Submissions
                    .filter(sub => sub.executedAt !== null && sub.isValid())
                    .map(sub => sub.getPatternInfo())
                failed = user.Submissions
                    .filter(s => s.executedAt !== null && !s.isValid())
                    .map(sub => sub.getPatternInfo())
                queued = user.Submissions.filter(s => s.executedAt === null)[0]
            }

            if (queued) {
                (await Submission.findAll({
                    where: { executedAt: null },
                    order: [ ['createdAt', 'ASC'] ],
                    raw: true
                })).forEach((sub, i) => {
                    if (sub.pattern === queued.pattern) {
                        queuePos = i
                    }
                })
            }
        }

        let mostRecent = null
        if (user && (patterns.length || failed.length)) {
            if (!failed.length) {
                mostRecent = patterns[0]
            } else if (!patterns.length) {
                mostRecent = failed[0]
            } else {
                mostRecent = (patterns[0].createdAt < failed[0].createdAt) ? failed[0] : patterns[0]
            }
        }

        const userData = (user) ? {
            username: user.username,
            score: user?.score,
            isAdmin: user?.isAdmin,
            patterns,
            queued: (queued) ? { pattern: queued.pattern, position: queuePos + 1 } : null,
            failed,
            mostRecent
        } : null

        res.render(page, {
            page,
            message,
            user: userData,
            title: process.env.TITLE || 'The Game',
            appName: process.env.APP_NAME || ''
        })
    } catch(err) {
        return next(err)
    }
})

router.post('/pattern', checkUserAuth, async (req, res) => {
    const pattern = req.body?.pattern?.trim().toLowerCase() || null
    
    try {
        if (!PATTERN_REGEX.test(pattern)) {
            throw new AppError('That is not a valid pattern format.', 400)
        }

        const otherSub = await Submission.findOne({
            where: {
                [Op.and]: {
                    UserId: req.session.user.id,
                    [Op.or]: { executedAt: null, pattern }
                }
            }
        })
        if (otherSub?.executedAt === null) {
            throw new AppError('You can only have one queued pattern at a time.', 400)
        } else if (otherSub?.pattern === pattern) {
            throw new AppError('You have already tried that pattern!', 400)
        }

        const sub = await Submission.create({
            pattern,
            UserId: req.session.user.id
        })
        if (!sub) {
            throw new AppError('No submission was returned from creation method.', 500)
        }

        logger.debug(`Added new submission for User ${req.session.user.username}: ${pattern}`)

        req.session.message = 'Your pattern has been queued to run, go check out the badge LED table in the VoV space!'
        res.redirect('/')

    } catch(err) {
        let message = 'There was a problem queueing your submission. Please try again!'
        if (err.status === 400) {
            message = err.message
        } else {
            logger.error(`Problem with submission for User: ${req.session.user.username} and Pattern: ${pattern}`)
            logger.error(err)
        }
        req.session.message = message
        res.redirect('/')
    }
})

router.get('/queue', async (req, res, next) => {
    try {
        const queue = await Submission.findAll({
            where: { executedAt: null },
            order: [ ['createdAt', 'ASC'] ],
            include: { all: true, nested: true },
            raw: true
        })
        
        res.json(queue.map(sub => {
            return {
                pattern: sub.pattern.replaceAll(/[a-z0-9]+/ig, '*'),
                username: sub['User.username'],
                createdAt: sub.createdAt.getTime()
            }
        }))

    } catch(err) {
        return next(err)
    }
})

router.post('/queue/run', checkAPIAuth, async (req, res, next) => {
    let nextSub = null
    try {
        nextSub = await Submission.findAll({
            where: { executedAt: null },
            order: [ ['createdAt', 'ASC'] ],
            include: { all: true, nested: true },
            limit: 1
        })
    } catch(err) {
        logger.warn('Unable to retrieve queue:', (err.message || err))
        return next(new AppError('Unable to retrieve queue', 500))
    }

    if (nextSub.length < 1) {
        res.status(204)
        return res.json(null)
    }

    let t = null
    let points = nextSub[0].getPoints()
    try {
        const sequelize = getConnection()
        t = await sequelize.transaction()

        if (nextSub[0].isValid()) {
            // this double checks the user's score to ensure integrity when new points added
            let score = await nextSub[0].User.checkScore()
            score += points
            nextSub[0].User.score = score
            nextSub[0].User.save({ transaction: t })
        }
        nextSub[0].executedAt = Date.now()
        await nextSub[0].save({ transaction: t })
        
        await t.commit()

    } catch(err) {
        if (t) { await t.rollback() }
        logger.error('Unable to save User or Submission:', (err.message.trim() || err))
        return next(new AppError('Unable to save User or Submission, queue not advanced', 500))
    }

    res.json({
        username: nextSub[0].User.username,
        path: nextSub[0].getPath(),
        isValid: nextSub[0].isValid(),
        points,
        createdAt: nextSub[0].createdAt.getTime()
    })
})

router.get('/leaderboard', async (req, res, next) => {

    try {
        const leaders = await User.findAll({
            where: { score: { [Op.gt]: 0 } },
            order: [ ['score', 'DESC'] ],
            raw: true,
            limit: 20
        })
        
        const data = leaders.map(user => { return {
            username: user.username,
            score: user.score
        } })
        
        if (req.headers.accept === 'application/json') {
            res.json(data)
        } else {
            res.render('leaderboard', {
                page: 'leaderboard',
                title: `${process.env.APP_NAME} LeaderBoard`,
                leaders: data
            })
        }

    } catch(err) {
        return next(err)
    }
})

router.get('/display', checkAPIAuth, (req, res) => {
    // All data will come from fetches to /queue and /leaderboard
    res.render('display', {
        page: 'display',
        title: process.env.TITLE,
        appName: process.env.APP_NAME
    })
})

module.exports = router
