# DisCo One

DistrictCon year one badge challenge.

## Working on this Repo Locally

1. Install Node.js, `git clone`,  and install necessary dependencies (`npm install`)
2. Install and Start PostgreSQL (on ubuntu it's `sudo service postgresql start`)
    * Connect to postgres as root: `sudo -u postgres psql`
    * install the UUID extension:
        - `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;`
    * Create the database and user for local testing:
        - `CREATE USER [username] WITH PASSWORD '[password]';`
        - `CREATE DATABASE [dbname] OWNER [username];`
        - `GRANT ALL PRIVILEGES ON DATABASE [dbname] TO [username];`
    * Connect to DB as DB user: `psql -U [username] -d [dbname] -h localhost`
    * Execute SQL commands as needed, like seeing table details: `\d+ "[TableName]"`
3. Load the table schema in the DB: `npm run db:init` (WARNING: this is a DESTRUCTIVE action!)
4. Start server cluster (`npm start`); or start server and watch for file changes `npm run watch`
5. Hit server at http://localhost:3000

You can see all patterns submitted by users in the system, limited to the most recent 20, using this query:

`select "Users".username, pattern, valid, resubmit, to_char("Submissions"."createdAt", 'MM-DD HH24:MI:SS') as created, to_char("Submissions"."executedAt", 'MM-DD HH24:MI:SS') as executed from "Submissions" inner join "Users" on "Submissions"."UserId" = "Users".id order by "Submissions"."updatedAt" desc limit 20;`

You can hit certain API endpoints using `fetch` in the browser. For example, to run the next pattern in the queue (be sure to be logged in as an admin):

```javascript
const result = await (await fetch('/queue/run', {
    method: 'post',
    headers: {
        accept: 'application/json'
    }
})).json()
```

## Deploying to Heroku

1. Create an "app" on the Heroku portal and deploy from GitHub
    * Click on "Connect to GitHub"
    * Select this repo and the correct branch (defaults to main)
    * Enable Automatic Deploys (if that's what you want)
1. Add the Postgres database
    * Go to the "Resources" and click on "Explore Add-ons"
    * Find the "Data Stores" section and select "Heroku Postgres"
    * Switch to "Postgres Essential" (the cheapest option)... we don't need much
    * Click "Provision Postgres Essential" and select your storage amount (1GB should be fine)
    * Select the app you just created and the pg DB level and click "Submit Order"
    * If you go to "Settings" and click "Reveal Config Vars" you should now see the `DATABASE_URL`
1. Add other env vars
    * Look at the `.env.example` file and add all of these to the "Config Vars" on Heroku
    * **Do NOT** add `DATABASE_URL` unless you are using a different provider (Heroku adds this automagically)
    * **DO NOT** add `PORT` unless you're doing something funky, otherwise Heroku handles this
    * Make sure the session secret and salt are proper random values!
1. Deploy the app for the first time
    * Click on the "Deploy" tab
    * Scroll down the "Manual Deploy", then click on "Deploy Branch"
    * The app will NOT run correctly, but this will automatically create your basic web dyno
1. Create the database structure
    * First, you need to log in with `psql` and add the uuid extension
        - Log in using `psql -U [USERNAME] -d [DB-NAME] -h [HOST_NAME]` from the env var
        - Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;`
        - You can quit `psql` using the `\q` command
    * Now you _could_ use `psql` to create the structure manually...
    * ...or there is a script that will do it for you.
    * Start by logging into the heroku cli with `heroku login` (obviously you need to install the CLI tool first)
    * Next, tell Heroku to require SSL for postgres: `heroku config:set PGSSLMODE=require --app girl-security-y1` (you might need to restart the dyno here)
        - Note that if you're getting a weird local cert issuer error, you could try "no-verify" for the value here...
    * Now ssh into the web dyno using `heroku ps:exec --app [HEROKU-APP-NAME]`
    * You should be in the app's root directory to start (check with `ls -l` to see app files)
    * Run `node db/create-database.js`
        - Depending on the state of the dyno, you might need to prepend this with the `DATABASE_URL=[...]` env var, and possibly change the `NODE_ENV` as well.
    * Log back into `psql` and check that there are 3 tables (using `\dt`) and that each table looks correct (using `\d+ "[TABLE-NAME]"`)
1. Create your first admin
    * First, either restart the dyno or just do a redeploy to get the app into a good state
    * Check the logs for "State changed from starting to up" and watch for any errors or crashes
    * Click on the "Settings" tab and scroll down to "Domains" to see the temporary app domain
    * Go to the app and create a new user
    * Log into `psql` and make sure the user was created (`select * from "Users";`)
    * Update the user to be an admin with: `update "Users" set "isAdmin"=true where username='[YOUR_USERNAME]';`
    * Log out and back in on the web and you should now see the admin navigation in the top right
1. Add your custom domain and connect it
    * Click on the "Settings" tab, then scroll down to "Domains"
    * Click "Add Domain", then enter your domain and click "Next"
    * Note the DNS target value, you'll need to add a CNAME from your domain to that target

