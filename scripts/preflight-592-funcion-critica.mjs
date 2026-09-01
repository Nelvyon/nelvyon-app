/**
 * ¿Poner RLS en `saas_tenants` rompe `nelvyon_current_saas_tenant_uuid()`?
 *
 * ES LA PREGUNTA QUE PUEDE ROMPERLO TODO. Esa funcion LEE `saas_tenants`, y de
 * ella dependen 596 politicas de otras tablas. Si al activar RLS la funcion
 * dejara de encontrar la fila, TODAS esas tablas devolverian cero filas.
 *
 * Lo que la salva —si se cumple— es `SECURITY DEFINER`: la funcion se ejecuta
 * con los privilegios de SU PROPIETARIO, no de quien la llama. Si el propietario
 * es superusuario, salta RLS y sigue viendo la fila.
 *
 * Aqui se comprueba, no se supone. SOLO LECTURA.
 */
import pg from "pg";
const C=["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n=C.find(x=>(process.env[x]??"").trim().length>0);
const cli=new pg.Client({connectionString:process.env[n],ssl:{rejectUnauthorized:false},statement_timeout:60000});
const o={ok:true};
try{
  await cli.connect(); await cli.query("BEGIN TRANSACTION READ ONLY");
  const q=async(s,p)=>(await cli.query(s,p)).rows;

  o.funciones = await q(
    `SELECT p.proname,
            pg_get_userbyid(p.proowner) AS propietario,
            p.prosecdef AS security_definer,
            (SELECT r.rolsuper FROM pg_roles r WHERE r.rolname = pg_get_userbyid(p.proowner)) AS propietario_es_superusuario,
            (SELECT r.rolbypassrls FROM pg_roles r WHERE r.rolname = pg_get_userbyid(p.proowner)) AS propietario_salta_rls
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public'
      WHERE p.proname IN ('nelvyon_current_saas_tenant_uuid','nelvyon_user_in_workspace',
                          'nelvyon_workspace_can_mutate','nelvyon_jwt_user_id',
                          'nelvyon_os_workspace_select')
      ORDER BY 1`);

  o.politicasQueDependen = Number((await q(
    `SELECT count(*)::int AS n FROM pg_policies
      WHERE coalesce(qual,'') LIKE '%nelvyon_current_saas_tenant_uuid%'
         OR coalesce(with_check,'') LIKE '%nelvyon_current_saas_tenant_uuid%'`))[0].n);

  // Y las que dependen de `nelvyon_user_in_workspace`, que lee `workspaces` y
  // `workspace_members` — dos tablas que NO se tocan aqui, pero conviene saberlo.
  o.politicasPorWorkspace = Number((await q(
    `SELECT count(*)::int AS n FROM pg_policies
      WHERE coalesce(qual,'') LIKE '%nelvyon_os_workspace%'
         OR coalesce(with_check,'') LIKE '%nelvyon_os_workspace%'`))[0].n);

  await cli.query("ROLLBACK");
}catch(e){o.ok=false;o.error=e instanceof Error?e.message:String(e);}
finally{await cli.end().catch(()=>{});}
console.log(JSON.stringify(o,null,2));
