const express = require('express')
const router = express.Router()
const AppError = require('../util/AppError')
const { checkUserAuth } = require('../util/middleware')
const logger = require('../util/logger')(process.env.LOG_LEVEL)


router.get('/', checkAdminAuth, (req, res) => {
    res.render('display', {
        page: 'display',
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})


module.exports = router
