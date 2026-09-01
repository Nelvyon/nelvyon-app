/** ¿Que roles pueden llegar de verdad a los datos? SOLO LECTURA. */
import pg from "pg";
const C=["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n=C.find(x=>(process.env[x]??"").trim().length>0);
const cli=new pg.Client({connectionString:process.env[n],ssl:{rejectUnauthorized:false},statement_timeout:60000});
await cli.connect(); await cli.query("BEGIN TRANSACTION READ ONLY");
const r=(await cli.query(`SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles
  WHERE rolname NOT LIKE 'pg\_%' ORDER BY rolcanlogin DESC, rolname`)).rows;
console.log(JSON.stringify(r,null,1));
await cli.query("ROLLBACK"); await cli.end();
