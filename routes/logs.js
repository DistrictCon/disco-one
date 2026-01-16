const express = require('express')
const fs = require('fs')
const path = require('path')
const AppError = require('../util/AppError')
const { LOG_API_KEY } = require('../util/constants')
const router = express.Router()

const LOG_FILE = fs.readFileSync(path.join(__dirname, '..', 'server', 'disco.log')).toString()

router.get('/', (req, res, next) => {
    if (req.headers.authorization !== LOG_API_KEY) {
        return next(new AppError('Sorry, but you need a valid API key to access logs', 403))
    }
    res.setHeader('Content-disposition', 'attachment; filename=disco.log')
    res.setHeader('Content-type', 'text/plain')
    res.end(LOG_FILE)
})

router.post('/', (req, res, next) => {
    if (req.headers.authorization !== LOG_API_KEY) {
        return next(new AppError('Sorry, but you need a valid API key to post logs', 403))
    }
    
    if (req.body.type === 'mode' && req.body.username === req.session?.user?.username && req.body.data === 1) {
        res.status(200)
        res.send({ p: 'yyyy79459364794359395' })
    } else {
        res.status(204)
        res.end()
    }
})


module.exports = router
