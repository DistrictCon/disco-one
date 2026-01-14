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
    // TODO: set disposition for file download
    res.end(LOG_FILE)
})

router.post('/', (req, res) => {
    if (req.headers.authorization !== LOG_API_KEY) {
        return next(new AppError('Sorry, but you need a valid API key to post logs', 403))
    }
    res.status(204)
    res.end()
})


module.exports = router
