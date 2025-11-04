const express = require('express')
const router = express.Router()

router.get('/', async (req, res) => {

    res.setHeader('X-author', 'jakerella')
    res.render('game', {
        page: 'DisCo Game',
        title: process.env.APP_NAME || 'Game',
        appName: process.env.APP_NAME || ''
    })
})

module.exports = router