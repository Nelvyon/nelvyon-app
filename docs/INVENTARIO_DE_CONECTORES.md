# Qué se puede conectar hoy

Lo escribe `elInventarioDeConectoresNoPromete.test.ts` en cada ejecución. **No se
edita a mano.** El estado de cada conector NO es el que declara su ficha: es el que
se deduce de mirar si su adaptador existe, si llama de verdad a la API del
proveedor, si sus rutas están y si hay credenciales puestas.

Son **16 conectores**. **Ninguno** ha hablado nunca con la API real de su
proveedor: nada se ha desplegado. Eso vale para los dieciséis sin excepción, y por
eso se declara aparte del estado — si fuera un estado más, un conector «disponible»
taparía que nadie lo ha visto funcionar.

| Estado | Cuántos | Qué significa |
|---|---|---|
| `AVAILABLE` | 0 | adaptador, rutas y credenciales: se puede usar ya |
| `ADAPTER_READY` | 0 | el código está y funciona; falta credencial |
| `SANDBOX_READY` | 0 | hay entorno de pruebas del proveedor conectado |
| `MOCK_ONLY` | 0 | hay fichero, pero devuelve datos inventados |
| `CREDENTIAL_REQUIRED` | 9 | sólo falta una clave que alguien tiene que dar |
| `PROVIDER_REQUIRED` | 7 | hace falta una cuenta o un contrato; no lo desbloquea el código |
| `DECLARED_ONLY` | 0 | está en el registro y no hay nada detrás |

## Uno por uno

| Conector | Categoría | Dice el registro | Estado real | Depende de | Qué falta |
|---|---|---|---|---|---|
| Google Analytics 4 `google-analytics-4` | analytics | `live` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: GA4_PROPERTY_ID, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET |
| Google Search Console `google-search-console` | seo | `live` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET |
| Google Ads `google-ads` | ads | `oauth_ready` | `PROVIDER_REQUIRED` | proveedor | token de desarrollador y cuenta MCC aprobada por Google; claves sin poner: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID |
| Meta Ads (Facebook/Instagram) `meta-ads` | ads | `oauth_ready` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: META_APP_ID, META_APP_SECRET |
| TikTok Ads `tiktok-ads` | ads | `stub` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: TIKTOK_APP_ID, TIKTOK_APP_SECRET |
| LinkedIn Ads `linkedin-ads` | ads | `stub` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET |
| SEMrush `semrush` | seo | `stub` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: SEMRUSH_API_KEY |
| Shopify `shopify` | commerce | `oauth_ready` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: SHOPIFY_API_KEY, SHOPIFY_API_SECRET |
| HubSpot CRM `hubspot-crm` | crm | `planned` | `PROVIDER_REQUIRED` | proveedor | el adaptador, y antes aplicación registrada en HubSpot |
| Salesforce `salesforce-crm` | crm | `planned` | `PROVIDER_REQUIRED` | proveedor | el adaptador, y antes org de Salesforce y aplicación conectada |
| Klaviyo `klaviyo` | email | `planned` | `PROVIDER_REQUIRED` | proveedor | el adaptador, y antes cuenta de Klaviyo con acceso a su API |
| Mailchimp `mailchimp` | email | `planned` | `PROVIDER_REQUIRED` | proveedor | el adaptador, y antes cuenta de Mailchimp con clave de API |
| Amazon SES `amazon-ses` | email | `live` | `PROVIDER_REQUIRED` | proveedor | salida del sandbox de SES, que la aprueba AWS; claves sin poner: SES_REGION, SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_FROM_EMAIL |
| WhatsApp Business `whatsapp` | comms | `stub` | `PROVIDER_REQUIRED` | proveedor | número verificado y aprobación de plantillas por Meta; claves sin poner: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID |
| Twilio SMS/Voice `twilio` | comms | `stub` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN |
| Telegram Bot `telegram` | comms | `stub` | `CREDENTIAL_REQUIRED` | credencial | claves sin poner: TELEGRAM_BOT_TOKEN |

## Qué se podría comprobar sin gastar un céntimo

«No verificado» y «no verificable» no son lo mismo. Leer quién soy, a qué cuenta
estoy atado y qué permisos tengo no cuesta nada en ninguna de estas APIs; crear una
campaña o enviar un mensaje sí. Esta tabla separa las dos cosas para que, el día que
haya una credencial, se sepa exactamente qué se puede hacer en ese momento.

| Conector | Gratis de comprobar | Nunca bajo este modo | ¿Hoy? |
|---|---|---|---|
| `google-analytics-4` | identidad del token, propiedades accesibles, permisos, salud de la API | — | faltan credenciales |
| `google-search-console` | identidad del token, sitios verificados, permisos, salud de la API | consultas de volumen en herramientas de pago por crédito | faltan credenciales |
| `google-ads` | identidad del token, cuentas publicitarias visibles, permisos, salud de la API | crear campaña, activar campaña, cambiar presupuesto | faltan credenciales |
| `meta-ads` | identidad del token, cuentas publicitarias visibles, permisos, salud de la API | crear campaña, activar campaña, cambiar presupuesto | faltan credenciales |
| `tiktok-ads` | identidad del token, cuentas publicitarias visibles, permisos, salud de la API | crear campaña, activar campaña, cambiar presupuesto | faltan credenciales |
| `linkedin-ads` | identidad del token, cuentas publicitarias visibles, permisos, salud de la API | crear campaña, activar campaña, cambiar presupuesto | faltan credenciales |
| `semrush` | identidad del token, sitios verificados, permisos, salud de la API | consultas de volumen en herramientas de pago por crédito | faltan credenciales |
| `shopify` | identidad de la app, tienda asociada, permisos concedidos | modificar catálogo o pedidos | faltan credenciales |
| `hubspot-crm` | identidad del token, portal o instancia asociada, permisos | escribir contactos reales | faltan credenciales |
| `salesforce-crm` | identidad del token, portal o instancia asociada, permisos | escribir contactos reales | faltan credenciales |
| `klaviyo` | identidad, dominios verificados, cuota y estado de sandbox, salud de la API | enviar correo real, envío masivo | faltan credenciales |
| `mailchimp` | identidad, dominios verificados, cuota y estado de sandbox, salud de la API | enviar correo real, envío masivo | faltan credenciales |
| `amazon-ses` | identidad, dominios verificados, cuota y estado de sandbox, salud de la API | enviar correo real, envío masivo | faltan credenciales |
| `whatsapp` | identidad, números o bots asociados, estado de las plantillas | enviar mensaje, abrir conversación | faltan credenciales |
| `twilio` | identidad, números o bots asociados, estado de las plantillas | enviar mensaje, abrir conversación | faltan credenciales |
| `telegram` | identidad, números o bots asociados, estado de las plantillas | enviar mensaje, abrir conversación | faltan credenciales |

## Lo que este inventario NO dice

- **Que ninguno funcione.** Dice que el código está escrito y a dónde llama. Que la
  API del proveedor responda lo que el adaptador espera no se sabrá hasta que se
  hable con ella, y eso exige credenciales y despliegue.
- **Que `CREDENTIAL_REQUIRED` sea trabajo de nadie.** Es trabajo de quien tenga las
  cuentas, no de quien escribe código.
