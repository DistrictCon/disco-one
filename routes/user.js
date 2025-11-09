const express = require('express')
const router = express.Router()

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

router.post('/login', (req, res) => {
    if (req.session.user) {
        req.session.message = 'You are already logged in!'
        return res.redirect('/')
    }

    console.log(req.body.username)
    console.log(req.body.password)

    // TODO: check user/pass & log them in

    req.session.user = { username: req.body.username }
    req.session.message = 'You are now logged in!'

    return res.redirect('/')
})

router.get('/logout', (req, res) => {
    if (req.session.user) {
        // TODO: destroy session
        req.session.user = null
    }

    req.session.message = 'You have been logged out.'
    return res.redirect('/')
})

module.exports = router
