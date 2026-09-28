// TEST-ONLY stand-in: same tagged-template `sql` API (plus sql.query, used by a couple of test
// scripts for a plain TRUNCATE), backed by node-postgres against a local DB.
const { Pool } = require("pg");
let pool;
const getPool = () => (pool ||= new Pool({ connectionString: process.env.POSTGRES_URL }));
function sql(strings, ...values) {
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? "$" + (i + 1) : ""), "");
  return getPool().query(text, values).then((r) => ({ rows: r.rows, rowCount: r.rowCount, command: r.command }));
}
sql.query = (text, params) => getPool().query(text, params).then((r) => ({ rows: r.rows, rowCount: r.rowCount, command: r.command }));
module.exports = { sql };
