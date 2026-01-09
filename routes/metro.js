const express = require('express')
const AppError = require('../util/AppError')
const router = express.Router()

const GARBAGE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-.|'
const GARBAGE_SIZE = [300, 800]
const KEY_PARTS = {
    blue: '7ce33c5',
    green: 'f6a094',
    orange: '618bfa',
    red: 'c432bb',
    yellow: 'cae0801'
}


router.get('/silver', (req, res, next) => {
    const key = Object.keys(KEY_PARTS)
        .sort((a, b) => (a < b) ? -1 : 1)
        .reduce((p, c) => { return p + KEY_PARTS[c] }, '')
    console.log(key, req.headers.authorization)
    if (req.headers.authorization !== key) {
        return next(new AppError('Not Authorized', 403))
    }
    res.json({
        pattern: '1234567890' // TODO: update
    })
})

router.get('/:color', (req, res, next) => {
    if (!KEY_PARTS[req.params.color]) {
        return next(new AppError('Not Found', 404))
    }

    const garbage = []
    const size = Math.floor(Math.random() * (GARBAGE_SIZE[1] - GARBAGE_SIZE[0])) + GARBAGE_SIZE[0]
    for (let i=0; i<size; ++i) {
        garbage.push(generateGarbage())
    }
    garbage[Math.floor(Math.random() * garbage.length)] = '|key:'+KEY_PARTS[req.params.color]+'|'
    
    res.status(206)
    res.end(garbage.join(''))
})

function generateGarbage() {
    const size = Math.floor((Math.random() * 15) + 5)
    const garbage = []
    for (let i=0; i<size; ++i) {
        garbage.push(GARBAGE_CHARS[Math.floor(Math.random() * GARBAGE_CHARS.length)])
    }
    return garbage.join('')
}


module.exports = router
