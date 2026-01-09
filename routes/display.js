const express = require('express')
const router = express.Router()
const { checkAdminAuth } = require('../util/middleware')


router.get('/', checkAdminAuth, (req, res) => {
    res.render('display', {
        page: 'display',
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})


module.exports = router
