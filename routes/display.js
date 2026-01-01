const express = require('express')
const router = express.Router()
const AppError = require('../util/AppError')
const { checkUserAuth } = require('../util/middleware')
const logger = require('../util/logger')(process.env.LOG_LEVEL)


router.get('/', checkUserAuth, (req, res, next) => {
    if (!req.session.user.isAdmin) {
        return next(new AppError('Sorry, but you need to be an admin to access this page.', 403))
    }
    res.render('display', {
        page: 'display',
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})


module.exports = router
