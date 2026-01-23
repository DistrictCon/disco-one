require('dotenv').config({ override: true })

const express = require('express')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const AppError = require('../util/AppError')
const { getConnection } = require('../util/database')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const game = require('../routes/game')
const user = require('../routes/user')
const admin = require('../routes/admin')
const metro = require('../routes/metro')
const logs = require('../routes/logs')

const PORT = process.env.PORT || 80

async function main() {

    /* ********** basic express app creation ********** */
    const app = express()
    app.use(express.static('static'))
    app.set('view engine', 'pug')
    app.set('x-powered-by', false)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))


    /* ******* testing DB connection ******** */
    const db = getConnection()
    try {
        await db.authenticate()
        logger.info('Successfuly tested DB connection on process start.')
    } catch (err) {
        logger.error('Unable to connect to the database:', err)
        return Promise.reject(new AppError('Unable to connect to database.', 500))
    }


    /* ********** session handling ********** */
    const sessionOptions = {
        store: new pgSession({
            tableName: 'user_sessions',
            conString: process.env.DATABASE_URL
        }),
        secret: process.env.SESS_SECRET,
        cookie: { maxAge: 86400000 * 3 }, // 3 days
        name: `${process.env.APP_NAME}-session`,
        saveUninitialized: false,
        resave: false,
        cookie: { maxAge: (1000 * 60 * 60 * 24 * 3) }
    }
    if (process.env.NODE_ENV !== 'development') {
        app.set('trust proxy', 1)
        sessionOptions.cookie.secure = true
    }
    app.use(session(sessionOptions))


    /* ************** IP BLOCKING **************** */
    let blockedIPs = []
    try { blockedIPs = JSON.parse('["'+process.env.BLOCKED_IPS.split(',').join('", "')+'"]') } catch(_) {}
    logger.info('BLOCKING IPs: '+JSON.stringify(blockedIPs))
    app.use((req, res, next) => {
        const headerIP = req.headers['X-Forwarded-For'] || 
            req.headers['X-Forwarded'] || 
            req.headers['Forwarded-For'] || 
            req.headers['Forwarded']
        const clientIP = (headerIP) ? headerIP.split(',')[0].trim() : (req.socket.remoteAddress || req.ip)
        console.log(clientIP)
        if (blockedIPs.includes(clientIP)) {
            return res.status(418).end('Nope')
        } else {
            return next()
        }
    })

    /* ********** routes and middleware ********** */
    app.use('/', game)
    app.use('/metro', metro)
    app.use('/user', user)
    app.use('/admin', admin)
    app.use('/logs', logs)

    
    app.use((req, res, next) => {
        const err = new Error('Sorry, but I could not find that page.')
        err.status = 404
        next(err)
    })

    app.use((err, req, res, next) => {
        let status = err.status || 500
        let message = (status > 499) ? 'Sorry, there was a problem. Try again later.' : err.message
        if (status > 499) {
            logger.error(`${err.message || err} ${err.stack.split('\n')[1]}`)
        }

        if (status === 401) {
            req.session.message = message
            return res.redirect('/?r=' + encodeURIComponent(req.path))
        }
        
        res.status(status)
        
        if (req.headers.accept === 'application/json') {
            res.json({ status, message })
        } else {
            res.render('error', {
                page: 'error',
                user: req.session?.user || null,
                title: `${process.env.APP_NAME} Error`,
                message
            })
        }
    })


    /* ************* app startup ************* */
    const server = app.listen(PORT, () => {
        if (process.env.NODE_ENV === 'development') {
            logger.info(`${process.env.APP_NAME} is listening at https://localhost:${PORT}`)
        } else {
            logger.info(`${process.env.APP_NAME} is listening on port ${PORT}`)
        }
    })
    /* *************************************** */


    /* ********** graceful shutdown ********** */
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    function shutdown() {
        console.log('Handling SIGINT/TERM...')
        server.close(() => {
            console.log('Express shutdown complete, closing DB connections...')
            const db = getConnection()
            db.close().then(() => {
                console.log('DB connection closed, terminating.')
                process.exit(0)
            })
        })
    }
    /* ************************************** */
}


if (require.main === module) {
    main()
}

module.exports = main
