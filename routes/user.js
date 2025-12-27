const express = require('express')
const router = express.Router()
const { User } = require('../db/models/app-models')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

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

module.exports = router
