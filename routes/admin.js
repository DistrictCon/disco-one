const express = require('express')
const router = express.Router()
const { getConnection } = require('../util/database')
const { Submission, User } = require('../db/models/app-models')
const { Op, QueryTypes } = require('sequelize')
const { checkAdminAuth } = require('../util/middleware')
const { OVERCLOCK_PERCENT, STARTER_PATTERN } = require('../util/constants')
const patterns = require('../db/patterns.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const sequelize = getConnection()

const CHART_MAX = 100
const BAR_HEIGHT_MIN = 3

router.get('/', checkAdminAuth, async (req, res) => {
    const userData = await User.findAll({
        attributes: ['id', 'username', 'email', 'score', 'isAdmin'],
        order: [ ['username', 'ASC'] ],
        include: { all: true, nested: true }
    })

    const users = userData.map(user => {
        const validSubmissions = user.Submissions.reduce((p, c) => { return p + ((c.isValid()) ? 1 : 0) }, 0)
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            score: user.score,
            submissions: [ validSubmissions, user.Submissions.length - validSubmissions ],
            isAdmin: user.isAdmin
        }
    })

    const message = req.session.message || null
    req.session.message = null


    const byHourData = {}
    const byHourValues = []
    let chartExtremes = null
    let patternsByHour = []

    const usersByHour = await sequelize.query(
        `SELECT count(id), to_char("createdAt", 'MM-DD:HH24') as createhour 
        FROM "Users" WHERE "isAdmin" = false 
        GROUP BY createhour ORDER BY createhour`, {
        type: QueryTypes.SELECT,
    })
    if (usersByHour.length) {
        usersByHour.forEach(entry => {
            if (!byHourData[entry.createhour]) { byHourData[entry.createhour] = {} }
            byHourData[entry.createhour].users = entry.count
        })
        patternsByHour = await sequelize.query(
            `SELECT count("Submissions".id), to_char("Submissions"."createdAt", 'MM-DD:HH24') as createhour 
            FROM "Submissions" LEFT OUTER JOIN "Users" ON "Users".id = "Submissions"."UserId" 
            WHERE valid = true and "Users"."isAdmin" = false 
            GROUP BY createhour ORDER BY createhour`, {
            type: QueryTypes.SELECT,
        })
        patternsByHour.forEach(entry => {
            if (!byHourData[entry.createhour]) { byHourData[entry.createhour] = {} }
            byHourData[entry.createhour].patterns = entry.count
        })
        
        chartExtremes = { minUsers: 9999, maxUsers: 0, minPatterns: 9999, maxPatterns: 0 }
        const start = usersByHour[0].createhour
        const end = (patternsByHour.length) ? patternsByHour[patternsByHour.length-1].createhour : start
        let now = start
        while (now <= end) {
            const users = Number(byHourData[now]?.users) || 0
            const patterns = Number(byHourData[now]?.patterns) || 0

            if (users < chartExtremes.minUsers) { chartExtremes.minUsers = users }
            if (users > chartExtremes.maxUsers) { chartExtremes.maxUsers = users }
            if (patterns < chartExtremes.minPatterns) { chartExtremes.minPatterns = patterns }
            if (patterns > chartExtremes.maxPatterns) { chartExtremes.maxPatterns = patterns }

            const time = now.split(/[\-\:]/)


            // TODO: adjust for timezone (-4 hours)
            const hourDisplay = `${time[0]}/${time[1]} ${time[2]}:00`
            byHourValues.push({ hour: hourDisplay, users, patterns })
            
            let nextHour = Number(time[2]) + 1
            let nextDay = Number(time[1])
            let nextMonth = Number(time[0])
            if (nextHour > 23) {
                nextDay++
                nextHour = 0
            }
            if ([1, 3, 5, 7, 8, 10, 12].includes(Number(time[0])) && nextDay > 31) {
                nextDay = 1
                nextMonth++
            } else if ([4, 6, 9, 11].includes(Number(time[0])) && nextDay > 30) {
                nextDay = 1
                nextMonth++
            } else if (nextDay > 28) {
                nextDay = 1
                nextMonth++
            }
            now = `${(''+nextMonth).padStart(2, '0')}-${(''+nextDay).padStart(2, '0')}:${(''+nextHour).padStart(2, '0')}`
        }
    }

    const countsByPattern = {}
    ;(await Submission.count({
        where: { [Op.or]: { executedAt: { [Op.ne]: null }, resubmit: true }, valid: true },
        group: ['pattern']
    })).forEach(sub => { countsByPattern[sub.pattern] = sub.count })

    const findTimes = {}
    ;(await sequelize.query(
        `SELECT pattern, AVG(EXTRACT(EPOCH FROM ("Submissions"."createdAt" - "Users"."createdAt")) / 3600) as avgfindtime 
        FROM "Submissions" LEFT OUTER JOIN "Users" ON "Users".id = "Submissions"."UserId" 
        WHERE "executedAt" is not null AND "valid" is true
        GROUP BY pattern ORDER BY avgFindTime`, {
        type: QueryTypes.SELECT,
    })).forEach(entry => findTimes[entry.pattern] = Math.round(entry.avgfindtime * 10) / 10 )

    const puzzles = Object.keys(patterns).map(p => {
        return {
            pattern: p,
            ...patterns[p],
            found: countsByPattern[p] || 0,
            avgFindTime: findTimes[p]
        }
    })

    const maxScore = Submission.getMaxPoints()

    const allUsers = await User.findAll({ where: { isAdmin: false } })
    const foundByUser = await Submission.count({
        where: { [Op.or]: { executedAt: { [Op.ne]: null }, resubmit: true }, valid: true },
        group: ['UserId']
    })
    const failedByUser = await Submission.count({
        where: { executedAt: { [Op.ne]: null }, valid: false },
        group: ['UserId']
    })
    
    const averageWait = Math.round((await sequelize.query(
        `SELECT AVG(EXTRACT(EPOCH FROM ("executedAt" - "createdAt"))) as averagewait
        FROM "Submissions" WHERE "executedAt" is not null`, {
        type: QueryTypes.SELECT,
    }))[0]?.averagewait || 0)

    const stats = {
        maxScore,
        overclockScore: maxScore * (OVERCLOCK_PERCENT / 100),
        nonAdminUsers: allUsers.length,
        foundPatternCount: Object.keys(countsByPattern).length,
        avgFound: Math.round((foundByUser.reduce((p, c) => c.count + p, 0) / foundByUser.length) * 10) / 10 || 0,
        avgFailed: Math.round((failedByUser.reduce((p, c) => c.count + p, 0) / failedByUser.length) * 10) / 10 || 0,
        zeroPoints: await User.count({ where: { score: 0 } }),
        starterOnly: await User.count({ where: { score: patterns[STARTER_PATTERN].points } }),
        averageWait,
        byHourValues,
        chartExtremes: JSON.stringify((chartExtremes) ? chartExtremes : {minUsers:0,maxUsers:0,minPatterns:0,maxPatterns:0}),
        usersByHour: usersByHour.map(stat => { return { count: Number(stat.count), hour: stat.createhour } }),
        patternsByHour: patternsByHour.map(stat => { return { count: Number(stat.count), hour: stat.createhour } })
    }

    res.render('admin', {
        page: 'admin',
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || '',
        user: req.session.user,
        message,
        users: users.sort((a, b) => b.score - a.score),
        puzzles,
        stats
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
