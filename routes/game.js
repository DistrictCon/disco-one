const express = require('express')
const AppError = require('../util/AppError')

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

router.post('/pattern', (req, res, next) => {
    if (!req.session.user) {
        return next(new AppError('You must be logged in.', 401))
    }

    // TODO: check pattern and add to queue
    console.log('pattern:', req.body.pattern)

    res.render('game', {
        page: 'game',
        message: 'You have found a new pattern!',
        user: req.session.user,
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

router.get('/queue', (req, res) => {
    
    // TODO: retrieve the queue

    res.json([
        { username: 'jordan', pattern: 'rrrzzrzrrrz' },
        { username: 'roro', pattern: 'rzrzrzrzrzr' }
    ])
})

router.delete('/queue', (req, res) => {

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

router.get('/display', (req, res) => {

    // TODO: get queue and leaderboard data for display

    res.render('display', {
        page: 'display',
        queue: [],
        leaderboard: [],
        title: process.env.TITLE || 'The Game',
        appName: process.env.APP_NAME || ''
    })
})

module.exports = router
