const express = require('express')
const AppError = require('../util/AppError')
const { API_KEY } = require('../util/constants')
const router = express.Router()

const KEY_PARTS = API_KEY.split('-')
const COLORS = [ 'blue', 'green', 'orange', 'red', 'yellow' ]


router.get('/', (req, res, next) => {
    return next(new AppError('Color Not Found', 404))
})

router.get('/silver', (req, res, next) => {
    if (req.headers.authorization !== API_KEY && 
        req.headers.authorization !== API_KEY.replaceAll('-', '')
    ) {
        return next(new AppError('Not Authorized', 401))
    }
    res.json({
        pattern: 'r5319510296zy47941694293zg396924956941'
    })
})

router.get('/:color', (req, res, next) => {
    if (!COLORS.includes(req.params.color)) {
        return next(new AppError('Color Not Found', 404))
    }

    const index = COLORS.indexOf(req.params.color)
    res.status(206)
    res.json({
        index,
        part: KEY_PARTS[index]
    })
})


module.exports = router
