const express = require('express')
const { checkUserAuth, checkAPIAuth } = require('../util/middleware')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const router = express.Router()

router.get('/', (req, res) => {
    const page = (req.session?.user) ? 'game' : 'home'

    if (!req.session.user) {
        res.setHeader('X-author', 'jakerella')
    }

    // TODO: get user data from DB

    const message = req.session.message || null
    req.session.message = null

    res.render(page, {
        page,
        message,
        user: req.session?.user || null,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.post('/pattern', checkUserAuth, (req, res, next) => {

    // TODO: check pattern and add to queue
    console.log('pattern:', req.body?.pattern)

    req.session.message = 'You have found a new pattern!'

    res.redirect('/')
})

router.get('/queue', (req, res) => {
    
    // TODO: retrieve the queue

    res.json([
        { username: 'jordan', pattern: 'rrrzzrzrrrz' },
        { username: 'roro', pattern: 'rzrzrzrzrzr' }
    ])
})

router.delete('/queue', checkAPIAuth, (req, res) => {

    // TODO: return and remove the next in the queue

    res.json({ username: 'jordan', pattern: 'rrrzzrzrrrz' })
})

router.get('leaderboard', (req, res) => {

    // TODO: retrieve leaderboard data

    res.json([
        { username: 'jordan', watts: 75 },
        { username: 'roro', watts: 30 }
    ])
})

router.get('/display', checkAPIAuth, (req, res) => {

    // TODO: get queue and leaderboard data for display

    res.render('display', {
        page: 'display',
        queue: [
            { username: 'jordan', pattern: 'rrrzzrzrrrz' },
            { username: 'roro', pattern: 'rzrzrzrzrzr' }
        ],
        leaderboard: [
            { username: 'jordan', watts: 75 },
            { username: 'roro', watts: 30 }
        ],
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

module.exports = router
