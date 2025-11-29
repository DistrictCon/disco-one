const express = require('express')
const { checkUserAuth, checkAPIAuth } = require('../util/middleware')
const { Op } = require('sequelize')
const { getConnection } = require('../util/database')
const { Submission, Queue } = require('../db/models/app-models')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const { PATTERN_REGEX } = require('../util/constants')
const AppError = require('../util/AppError')

const router = express.Router()

router.get('/', (req, res) => {
    const page = (req.session?.user) ? 'game' : 'home'

    if (!req.session.user) {
        res.setHeader('X-author', 'jakerella')
    }

    // TODO: get user data from DB

    const message = req.session.message || null
    req.session.message = null

    res.render(page, {
        page,
        message,
        user: req.session?.user || null,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.post('/pattern', checkUserAuth, async (req, res) => {
    const pattern = req.body?.pattern?.toLowerCase() || null
    
    let trans = null
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

        trans = await getConnection().transaction()
        const sub = await Submission.create(
            { UserId: req.session.user.id, pattern },
            { transaction: trans }
        )
        const queued = await Queue.create(
            { UserId: req.session.user.id, SubmissionId: sub.id },
            { transaction: trans }
        )
        await trans.commit()

        logger.debug(`Added new submission for User ${req.session.user.username}: ${pattern}`)

        req.session.message = 'Your pattern has been queued to run, go check out the laser table!'
        res.redirect('/')

    } catch(err) {
        let message = 'There was a problem queueing your submission. Please try again!'
        if (err.status === 400) {
            message = err.message
        } else {
            logger.error(`Problem with submission for User: ${req.session.user.username} and Pattern: ${pattern}`)
            logger.error(err)
        }
        if (trans) {
            trans.rollback()
        }
        req.session.message = message
        res.redirect('/')
    }
})

router.get('/queue', (req, res) => {
    
    // TODO: retrieve the queue

    res.json([
        { username: 'jordan', pattern: 'rrrzzrzrrrz' },
        { username: 'roro', pattern: 'rzrzrzrzrzr' }
    ])
})

router.delete('/queue', checkAPIAuth, (req, res) => {

    // TODO: return and remove the next in the queue

    res.json({ username: 'jordan', pattern: 'rrrzzrzrrrz' })
})

router.get('leaderboard', (req, res) => {

    // TODO: retrieve leaderboard data

    res.json([
        { username: 'jordan', watts: 75 },
        { username: 'roro', watts: 30 }
    ])
})

router.get('/display', checkAPIAuth, (req, res) => {

    // TODO: get queue and leaderboard data for display

    res.render('display', {
        page: 'display',
        queue: [
            { username: 'jordan', pattern: 'rrrzzrzrrrz' },
            { username: 'roro', pattern: 'rzrzrzrzrzr' }
        ],
        leaderboard: [
            { username: 'jordan', watts: 75 },
            { username: 'roro', watts: 30 }
        ],
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

module.exports = router
