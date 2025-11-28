const express = require('express')
const router = express.Router()
const User = require('../db/models/User')

router.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/')
    }

    // TODO: get user info from DB... but do we need this page???

    res.render('user', {
        page: 'user',
        user: req.session.user,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.post('/login', async (req, res, next) => {
    if (req.session?.user) {
        req.session.message = 'You are already logged in!'
        return res.redirect('/')
    }

    let user = null
    let message = null

    const username = User.cleanUsername(req.body.username)
    const password = User.hashPass(req.body.password)

    if (username && username === req.body.username) {
        user = await User.findOne({ where: { username: req.body.username } })

        if (user && user.password === password) {
            message = 'You are now logged in.'
        } else if (!user) {
            user = await User.create({ username, password })
            message = 'Your account has been created and you are logged in!'
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
    req.session.user = null
    req.session.save((_) => {
        req.session.regenerate((_) => {
            req.session.message = 'You have been logged out.'
            res.redirect('/')
        })
    })
})

module.exports = router
