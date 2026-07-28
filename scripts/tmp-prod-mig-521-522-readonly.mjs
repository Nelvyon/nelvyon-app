/**
 * READ-ONLY prod preflight for migrations 521–522.
 * Does NOT ALTER / INSERT / UPDATE / DELETE / DROP.
 *
 * Usage:
 *   railway run -s Postgres -e production -- node scripts/tmp-prod-mig-521-522-readonly.mjs
 *
 * Prefers DATABASE_PUBLIC_URL (proxy). Never prints connection strings.
 */
import pg from "pg";

const connectionString =
  process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_PUBLIC_URL / DATABASE_URL");
  process.exit(2);
}

const c = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

console.error("using_public_url", Boolean(process.env.DATABASE_PUBLIC_URL));

await c.connect();
await c.query("SET default_transaction_read_only = on");
await c.query("SET statement_timeout = '30s'");

const out = {};

out.db = (
  await c.query(
    `select current_database() as db, current_user as usr, inet_server_addr()::text as host`,
  )
).rows[0];

out.migs_521_522 = (
  await c.query(
    `select name, executed_at from _migrations where name like '521%' or name like '522%' order by name`,
  )
).rows;

out.last_migs = (
  await c.query(
    `select name, executed_at from _migrations order by executed_at desc nulls last, name desc limit 8`,
  )
).rows;

out.enrollment_cols = (
  await c.query(
    `select column_name, data_type, column_default, is_nullable
     from information_schema.columns
     where table_schema='public' and table_name='saas_sequence_enrollments'
       and column_name in ('email_opened','email_clicked','id','tenant_id','status')
     order by column_name`,
  )
).rows;

out.enrollment_volume = (
  await c.query(
    `select
       (select count(*)::bigint from saas_sequence_enrollments) as enrollments,
       (select count(*)::bigint from saas_sequences) as sequences,
       (select count(*)::bigint from saas_workflows) as workflows,
       (select pg_total_relation_size('saas_sequence_enrollments')) as enrollments_bytes,
       (select pg_total_relation_size('saas_workflows')) as workflows_bytes`,
  )
).rows[0];

out.workflow_check = (
  await c.query(
    `select conname, pg_get_constraintdef(oid) as def
     from pg_constraint
     where conrelid = 'public.saas_workflows'::regclass
       and contype = 'c'
       and conname like '%trigger_type%'`,
  )
).rows;

const checkDef = String(out.workflow_check[0]?.def || "");
out.check_includes_score_threshold = checkDef.includes("score_threshold");
out.check_includes_email_opened = checkDef.includes("email_opened");

out.incompatible_score_threshold_rows = (
  await c.query(
    `select count(*)::bigint as n from saas_workflows where trigger_type = 'score_threshold'`,
  )
).rows[0];

out.trigger_type_histogram = (
  await c.query(
    `select trigger_type, count(*)::bigint as n from saas_workflows group by 1 order by n desc`,
  )
).rows;

out.orphan_trigger_types = (
  await c.query(
    `select trigger_type, count(*)::bigint as n
     from saas_workflows
     where trigger_type not in (
       'contact_created','contact_updated','stage_changed','deal_stage_changed',
       'job_completed','manual','scheduled','form_submitted','tag_added',
       'email_opened','email_clicked','webhook_in','date_reached',
       'sequence_enrolled','review_received','score_threshold'
     )
     group by 1`,
  )
).rows;

out.lock_notes = {
  mig_521:
    "ADD COLUMN IF NOT EXISTS ... DEFAULT false — prefer off-peak; volume today ~0 rows",
  mig_522:
    "DROP+ADD CHECK — ACCESS EXCLUSIVE; validates rows; 0 score_threshold rows today",
};

console.log(JSON.stringify(out, null, 2));
await c.end();
