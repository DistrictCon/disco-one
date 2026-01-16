const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { User, Submission } = require('../db/models/app-models')
const { checkAdminAuth, checkUserAuth } = require('../util/middleware')
const AppError = require('../util/AppError')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const LEADERBOARD_MAX = 2

router.get('/', (req, res) => {
    return res.redirect('/')
})

router.post('/login-register', async (req, res, next) => {
    if (req.session?.user) {
        req.session.message = 'You are already logged in!'
        return res.redirect('/')
    }

    let user = null
    let message = null

    const username = User.cleanUsername(req.body.username)
    const password = User.hashPass(req.body.password)
    const register = req.body.register === 'true'

    let loggedIn = false
    const nextPage = (req.body.next) ? decodeURIComponent(req.body.next) : null

    if (username && username === req.body.username) {
        user = await User.findOne({ where: { username: req.body.username } })

        if (!register && user && user.password === password) {
            message = null
            loggedIn = true
            logger.info(`User login by: ${username}`)
        } else if (register && !user) {
            user = await User.create({ username, password })
            message = 'Your account has been created and you are logged in!'
            loggedIn = true
            logger.info(`A new user account has been registered: ${username}`)
        } else if (register && user) {
            user = null
            message = 'Sorry, but that username has been taken.'
            logger.debug(`User attempted to use existing username: ${username}`)
        } else {
            logger.info(`Failed user login (${(user) ? 'bad password' : 'bad username'}).`)
            user = null
            message = 'Sorry, but that username/password is not valid.'
        }
    } else {
        message = 'Sorry, but that is not a valid username.'
    }

    req.session.regenerate((err) => {
        if (err) { return next(err) }

        if (user) {
            req.session.user = {
                id: user.id,
                username: user.username,
                score: user.score,
                isAdmin: user.isAdmin
            }
        }

        req.session.message = message
        req.session.save((err) => {
            if (err) { return next(err) }

            if (loggedIn && nextPage) {
                res.redirect(nextPage || '/')
            } else {
                res.redirect('/')
            }
        })
    })
})

router.get('/logout', (req, res) => {
    const username = req.session?.user?.username || null
    req.session.user = null
    req.session.save((_) => {
        req.session.regenerate((_) => {
            req.session.message = 'You have been logged out.'
            logger.debug(`User logout: ${username}`)
            res.redirect('/')
        })
    })
})

router.get('/stats', checkUserAuth, async (req, res, next) => {
    const message = req.session.message || null
    req.session.message = null

    let user = null
    let patterns = { found: [], failed: [], queued: [] }
    let userRank = []
    try {
        user = await User.findOne({
            where: { id: req.session.user.id },
            attributes: ['id', 'username', 'score', 'isAdmin'],
            include: Submission,
            order: [
                [Submission, 'updatedAt', 'DESC']
            ]
        })

        if (!user) {
            return next(new AppError('Unable to retrieve user account', 400))
        }

        const subs = user.Submissions.map(sub => sub.getPatternInfo())
        patterns.found = subs.filter(sub => sub.points && (sub.executedAt !== null || sub.resubmit))
        patterns.failed = subs.filter(sub => sub.executedAt !== null && !sub.points)
        patterns.queued = subs.filter(sub => sub.executedAt === null)

        userRank = await User.findAll({
            where: { isAdmin: { [Op.eq]: false } },
            attributes: ['username', 'score'],
            order: [ ['score', 'DESC'] ],
            raw: true
        })

    } catch(err) {
        return next(err)
    }

    const leaderboard = userRank
        .map((u, i) => { return { username: u.username, score: u.score, pos: (i+1) } })
        .filter((u, i) => i < LEADERBOARD_MAX || u.username === user.username)
    
    const stats = {
        counts: { found: patterns.found.length, failed: patterns.failed.length, queued: patterns.queued.length },
        leaderboard,
        totalUsers: userRank.length,
        leaderboardMax: LEADERBOARD_MAX
    }

    /**
     * - time to each pattern (from user reg) vs global
     */

    res.render('stats', {
        page: 'stats',
        message,
        stats,
        user: req.session.user,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.get('/change-password', checkUserAuth, async (req, res) => {
    const message = req.session.message || null
    req.session.message = null

    res.render('change-password', {
        page: 'change-password',
        message,
        user: req.session.user,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.post('/change-password', checkUserAuth, async (req, res, next) => {
    try {
        const user = await User.findOne({
            where: { id: req.session.user.id },
            attributes: ['id', 'username', 'password']
        })

        if (user.password !== User.hashPass(req.body['current-password'])) {
            logger.info(`User (${user.username}) failed to enter current password when changing.`)
            req.session.message = 'Sorry, but that is not the current password.'
            return res.redirect('/user/change-password')
        }

        if (req.body['current-password'] === req.body['new-password']) {
            req.session.message = 'Looks like that is the same password!'
            return res.redirect('/user/change-password')
        }

        if (req.body['new-password']) {
            user.password = User.hashPass(req.body['new-password'])
            await user.save()
            logger.info(`User (${user.username}) changed their password.`)
            req.session.message = 'Your password has been changed!'
            res.redirect('/')
        }

    } catch(err) {
        logger.warn('Error while updating user password: ' + err.message | err.toString())
        return next(err)
    }
})

router.post('/edit', checkAdminAuth, async (req, res) => {
    const user = await User.findOne({
        where: { id: req.body.id }
    })
    if (!user) {
        req.session.message = 'Unable to find User record.'
        return res.redirect('/admin')
    }

    try {
        user.username = req.body.username
        if (req.body.isAdmin === 'true') {
            user.isAdmin = true
        } else {
            user.isAdmin = false
        }
        if (req.body.password.length > 0) {
            user.password = User.hashPass(req.body.password)
        }
        
        await user.save()

        req.session.message = 'User data saved!'
        res.redirect('/admin')

    } catch(err) {
        logger.warn('Unable to save User record: ' + err.message || err.toString())
        req.session.message = 'Unable to save User record.'
        return res.redirect('/admin')
    }
})

router.get('/:id', checkAdminAuth, async (req, res) => {
    const userData = await User.findOne({
        where: { id: req.params.id },
        attributes: ['id', 'username', 'score', 'isAdmin', 'createdAt'],
        include: { all: true, nested: true }
    })
    res.json({
        id: userData.id,
        username: userData.username,
        score: userData.score,
        isAdmin: userData.isAdmin,
        createdAt: userData.createdAt,
        submissions: userData.Submissions.map(sub => {
            return {
                id: sub.id,
                pattern: sub.pattern,
                executedAt: sub.executedAt,
                points: sub.getPoints()
            }
        })
    })
})

router.delete('/:id', checkAdminAuth, async (req, res, next) => {
    const user = await User.findOne({
        where: { id: req.params.id }
    })
    if (!user) {
        return next(new AppError('Unable to find User record for deletion.', 404))
    }

    try {
        await user.destroy()
        logger.info(`User record (${user.username}) deleted by ${req.session.user.username}`)
        res.json({ user: user.username })

    } catch(err) {
        return next(new AppError('Unable to delete User record: ' + err.message || err.toString(), 500))
    }
})


module.exports = router
