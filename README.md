# disco-one

Challenge repo for DistrictCon Year One


1. Install dependencies (`npm install`)
2. Install and Start PostgreSQL (on ubuntu it's `sudo service postgresql start`)
    * Connect to postgres as root: `sudo -u postgres psql`
    * install the UUID extension:
        - `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;`
    * Create the database and user for local testing:
        - `CREATE USER [username] WITH PASSWORD '[password]';`
        - `CREATE DATABASE [dbname] OWNER [username];`
        - `GRANT ALL PRIVILEGES ON DATABASE [dbname] TO [username];` (Note: for local testing only!)
    * Connect to DB as DB user: `psql -U [username] -d [dbname] -h localhost`
    * Execute SQL commands as needed, like seeing table details: `\d+ "[TableName]"`
3. Load the table schema in the DB: `npm run db:init` (WARNING: this is DESTRUCTIVE action!)
4. Start server cluster (`node .` or to watch for file changes `npm run watch`)
5. Hit server at http://localhost:3000

You can see all patterns in the database, limited to the most recent 20, using this query.

`select "Users".username, pattern, resubmit, to_char("Submissions"."updatedAt", 'MM-DD HH24:MI:SS') as updated, to_char("Submissions"."executedAt", 'MM-DD HH24:MI:SS') as executed from "Submissions" inner join "Users" on "Submissions"."UserId" = "Users".id order by "Submissions"."updatedAt" desc limit 20;`

You can hit the API endpoints using `fetch` in the browser. For example, to run the next pattern in the queue:

```javascript
const result = await (await fetch('/queue/run', {
    method: 'post',
    headers: {
        accept: 'application/json'
        authorization: 'the key'
    }
})).json()
```
