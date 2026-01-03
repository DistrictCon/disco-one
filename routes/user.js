const express = require('express')
const router = express.Router()
const { User, Submission } = require('../db/models/app-models')
const { checkAdminAuth } = require('../util/middleware')
const AppError = require('../util/AppError')
const logger = require('../util/logger')(process.env.LOG_LEVEL)


// TODO: allow users to change their password


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

    if (username && username === req.body.username) {
        user = await User.findOne({ where: { username: req.body.username } })

        if (!register && user && user.password === password) {
            message = 'You are now logged in.'
            logger.debug(`User login: ${username}`)
        } else if (register && !user) {
            user = await User.create({ username, password })
            message = 'Your account has been created and you are logged in!'
            logger.info(`A new user account has been registered: ${username}`)
        } else if (register && user) {
            user = null
            message = 'Sorry, but that username has been taken.'
            logger.debug(`User attempted to use existing username: ${username}`)
        } else {
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
                score: user.score
            }
            if (user.isAdmin) {
                req.session.user.isAdmin = true
            }
        }

        req.session.message = message
        req.session.save((err) => {
            if (err) { return next(err) }
            res.redirect('/')
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
