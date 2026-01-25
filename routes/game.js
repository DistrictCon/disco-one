const express = require('express')
const fs = require('fs')
const formatHTML = require('html')
const AppError = require('../util/AppError')
const { checkUserAuth, checkAdminAuth } = require('../util/middleware')
const { Op } = require('sequelize')
const { Submission, User } = require('../db/models/app-models')
const { getConnection } = require('../util/database')
const { LOG_API_KEY, OVERCLOCK_PERCENT, PATTERN_REGEX, STARTER_PATTERN } = require('../util/constants')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const router = express.Router()

const AUTHORS = ['jakerella', 'BigTaro', 'RoRo', 'ZeeTwii']
const MAX_QUEUE = 5

const LUMI_THRESHOLDS = [
    { percent: 5, title: 'The Baron', code: 'prismatic charging' },
    { percent: 15, title: 'The Siphon', code: 'suck it out' },
    { percent: 30, title: 'Blackouts', code: 'heart of darkness' },
    { percent: 35, title: 'The Defeated?', code: 'down but not out' },
    { percent: 55, title: 'Mech Preparation', code: 'mechanized siphonry' },
    { percent: 70, title: 'Alternative Source', code: 'by another name' },
    { percent: 85, title: 'The Ultimate Siphon', code: 'baron no more' },
    { percent: 95, title: 'The True Ending', code: 'disco inferno' }
]
const map = fs.readFileSync('./views/partials/map.txt').toString().split('\n').map(l => '        '+l).join('\n')


router.get('/', async (req, res, next) => {
    let page = 'home'
    let nextPage = null
    if (req.session?.user) {
        page = 'game'
        res.setHeader('X-author', AUTHORS[Math.floor(Math.random() * AUTHORS.length)])
    } else {
        res.setHeader('X-hacked-by', 'B.v.B.')
        nextPage = req.query.r || ''
    }

    const message = req.session.message || null
    req.session.message = null

    try {
        let user = null
        let failed = []
        let queued = null
        let queuePos = null
        
        if (req.session?.user) {
            user = await User.findOne({
                where: { id: req.session.user.id },
                attributes: ['id', 'username', 'score', 'isAdmin'],
                include: Submission,
                order: [
                    [Submission, 'updatedAt', 'DESC']
                ]
            })

            if (user) {
                const patterns = user.Submissions.map(sub => sub.getPatternInfo())
                found = patterns.filter(sub => sub.points && (sub.executedAt !== null || sub.resubmit))
                failed = patterns.filter(sub => sub.executedAt !== null && !sub.points)
                queued = patterns.filter(sub => sub.executedAt === null)
            }
            
            if (queued) {
                (await Submission.findAll({
                    where: { executedAt: null },
                    order: [ ['updatedAt', 'ASC'] ],
                    raw: true
                })).forEach((other, i) => {
                    queued.forEach(sub => {
                        if (other.pattern === sub.pattern && other.UserId === sub.UserId) {
                            sub.position = i+1
                        }
                    })
                })
            }
        }

        const maxScore = Submission.getMaxPoints()
        let mostRecent = null
        let milestones = []
        let progress = 0
        if (user && (found.length || failed.length)) {
            if (!failed.length) {
                mostRecent = found[0]
            } else if (!found.length) {
                mostRecent = failed[0]
            } else {
                mostRecent = (found[0].createdAt < failed[0].createdAt) ? failed[0] : found[0]
            }

            progress = (user.score / maxScore) * 100
            LUMI_THRESHOLDS.forEach(milestone => {
                if (progress > milestone.percent) {
                    milestones.push({ code: milestone.code, title: milestone.title })
                }
            })
        }

        const userData = (user) ? {
            username: user.username,
            score: user.score,
            progress: Math.round(progress),
            overclock: (progress > OVERCLOCK_PERCENT) ? 'overclock' : '',
            milestones,
            isAdmin: user.isAdmin,
            found,
            queued: (queued) ? queued.sort((a, b) => a.position - b.position) : null,
            failed,
            mostRecent
        } : null

        res.render(page, {
            page,
            message,
            user: userData,
            maxQueue: MAX_QUEUE,
            maxScore,
            nextPage,
            logApiKey: LOG_API_KEY,
            starterPattern: STARTER_PATTERN,
            title: process.env.TITLE || 'The Game',
            appName: process.env.APP_NAME || ''
        }, (err, html) => {
            if (err) { return next(err) }
            res.status(200)
            let formattedHTML = formatHTML.prettyPrint(html, { indent_size: 4 })
            formattedHTML = formattedHTML.replace('    </body>', '        <div><span><!--\n'+map+'\n        -->\n        </span></div>    </body>')
            res.send(formattedHTML)
        })
    } catch(err) {
        return next(err)
    }
})

router.get('/help', (req, res) => {
    const message = req.session.message || null
    req.session.message = null

    res.render('help', {
        page: 'help',
        message,
        user: req.session.user,
        logApiKey: LOG_API_KEY,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.get('/rules', (req, res) => {
    const message = req.session.message || null
    req.session.message = null

    res.render('rules', {
        page: 'rules',
        message,
        user: req.session.user,
        logApiKey: LOG_API_KEY,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.post('/pattern', checkUserAuth, async (req, res, next) => {
    const pattern = req.body?.pattern?.trim().toLowerCase() || null
    
    try {
        const message = await handlePattern(req.session.user, pattern)
        req.session.message = message
        res.setHeader('X-pattern', 'eTk0NzQxOTR6bzM5NjQ3MDk0Mjk1emc5NDEwMzc5M3piMTk0MTk0NzR6cjc0Mjc5Njk0Nw==')
        return res.redirect('/')
    } catch(err) {
        if (err.status && err.status < 500) {
            req.session.message = err.message
            return res.redirect('/')
        } else {
            next(err)
        }
    }
})

router.get('/pattern/:pattern', checkUserAuth, async (req, res) => {
    const pattern = req.params.pattern.trim().toLowerCase()
    
    try {
        const message = await handlePattern(req.session.user, pattern)
        req.session.message = message
        res.setHeader('X-pattern', 'eTk0NzQxOTR6bzM5NjQ3MDk0Mjk1emc5NDEwMzc5M3piMTk0MTk0NzR6cjc0Mjc5Njk0Nw==')
        return res.redirect('/')
    } catch(err) {
        if (err.status && err.status < 500) {
            req.session.message = err.message
            return res.redirect('/')
        } else {
            next(err)
        }
    }
})

async function handlePattern(user, pattern) {
    try {
        if (!PATTERN_REGEX.test(pattern)) {
            return 'That is not a valid pattern format.'
        }

        const count = await Submission.count({
            where: { UserId: user.id, executedAt: null }
        })
        if (count >= MAX_QUEUE) {
            return `Sorry, but you can only have ${MAX_QUEUE} patterns in the queue.`
        }

        const otherSub = await Submission.findOne({
            where: { UserId: user.id, pattern }
        })

        if (otherSub && otherSub.executedAt === null) {
            return 'You have already submitted that pattern to the queue!'
        } else if (otherSub && !otherSub.isValid()) {
            return 'You have already tried that pattern!'
        } else if (otherSub) {
            otherSub.executedAt = null
            otherSub.resubmit = true
            await otherSub.save()
            logger.debug(`User ${user.username} resubmitted a pattern: ${pattern}`)
            return 'Your pattern has been resubmitted! Go check out the laser display to see it run.'

        } else {
            await Submission.create({
                pattern,
                UserId: user.id,
                valid: Submission.isValid(pattern)
            })
            logger.debug(`Added new submission for User ${user.username}: ${pattern}`)
            return 'Your pattern has been queued to run, go check out the laser display in the VoV space!'
        }

    } catch(err) {
        logger.error(`Problem with submission for User: ${user.username} and Pattern: ${pattern}`)
        logger.error(err)
        return 'There was a problem queueing your submission. Please try again!'
    }
}

router.get('/queue', async (req, res, next) => {
    try {
        const count = await Submission.count({
            where: { executedAt: null }
        })
        const queue = await Submission.findAll({
            where: { executedAt: null },
            order: [ ['updatedAt', 'ASC'] ],
            include: { all: true, nested: true },
            raw: true,
            limit: 10
        })
        
        res.json({
            count,
            queue: queue.map(sub => {
                return {
                    pattern: ''.padStart(sub.pattern.length, '*'),
                    username: sub['User.username'],
                    score: sub['User.score'],
                    updatedAt: sub.updatedAt.getTime()
                }
            })
        })

    } catch(err) {
        return next(err)
    }
})

router.post('/queue/run', checkAdminAuth, async (req, res, next) => {
    let nextSub = null
    try {
        nextSub = await Submission.findAll({
            where: { executedAt: null },
            order: [ ['updatedAt', 'ASC'] ],
            include: { all: true, nested: true },
            limit: 1
        })
    } catch(err) {
        logger.warn('Unable to retrieve queue:', (err.message || err))
        return next(new AppError('Unable to retrieve queue', 500))
    }

    if (nextSub.length < 1) {
        res.status(204)
        return res.json({ path: null })
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
        const userCount = await User.count({
            where: { isAdmin: { [Op.eq]: false } }
        })
        const leaders = await User.findAll({
            where: { score: { [Op.gt]: 0 }, isAdmin: { [Op.eq]: false } },
            order: [ ['score', 'DESC'] ],
            raw: true,
            limit: 20
        })
        
        const data = leaders.map(user => { return {
            username: user.username,
            score: user.score
        } })
        
        if (req.headers.accept === 'application/json') {
            res.json({
                userCount,
                leaders: data
            })
        } else {
            res.render('leaderboard', {
                page: 'leaderboard',
                title: `${process.env.APP_NAME} LeaderBoard`,
                leaders: data,
                userCount
            })
        }

    } catch(err) {
        return next(err)
    }
})

router.get('/display', checkAdminAuth, (req, res) => {
    const message = req.session.message || null
    req.session.message = null

    res.render('display', {
        page: 'display',
        message,
        user: req.session.user,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})


module.exports = router
