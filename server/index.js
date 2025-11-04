require('dotenv').config({ override: true })

const express = require('express')
const session = require('express-session')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const game = require('../routes/game')


const PORT = process.env.PORT || 80

function main() {

    /* ********** basic express app creation ********** */
    const app = express()
    app.use(express.static('static'))
    app.set('view engine', 'pug')
    app.set('x-powered-by', false)
    app.use(express.urlencoded({ extended: false }))


    /* ********** session handling ********** */
    const sessionOptions = {
        secret: process.env.SESS_SECRET,
        cookie: { maxAge: 86400000 * 3 }, // 3 days
        name: `${process.env.APP_NAME}-session`,
        saveUninitialized: false
    }
    if (process.env.NODE_ENV !== 'development') {
        app.set('trust proxy', 1)
        sessionOptions.cookie.secure = true
    }
    app.use(session(sessionOptions))


    /* ********** routes and middleware ********** */
    app.use('/', game)


    app.use((req, res, next) => {
        const err = new Error('Sorry, but I could not find that page.')
        err.status = 404
        next(err)
    })

    app.use((err, req, res, next) => {
        let status = err.status || 500
        if (status > 499) {
            logger.error(`${err.message || err} ${err.stack.split('\n')[1]}`)
        }
        
        res.status(status)
        
        if (req.headers.accept === 'text/plain') {
            res.end((status > 499) ? 'Sorry, there was a problem. Try again later.' : err.message)
        } else {
            res.render('error', {
                page: 'error',
                title: `${process.env.APP_NAME} Error`,
                message: (status === 500) ? 'Sorry, we ran into a problem.' : err.message
            })
        }
    })


    /* ********** app startup ********** */
    app.listen(PORT, () => {
        if (process.env.NODE_ENV === 'development') {
            logger.info(`Listening at https://localhost:${PORT}`)
        } else {
            logger.info(`Listening on port ${PORT}`)
        }
    })
    /* ********************************* */
}


if (require.main === module) {
    main()
}

module.exports = main
