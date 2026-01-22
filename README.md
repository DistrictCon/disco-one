# DisCo One

DistrictCon year one badge challenge.

## Working on this Repo

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
