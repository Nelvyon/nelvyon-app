-- Las tablas que hasta hoy levantaba `create_all` al arrancar.
--
-- POR QUE HACIA FALTA
-- -------------------
-- 42 tablas del modelo ORM no las creaba ninguna migracion: aparecian porque
-- `Base.metadata.create_all()` se ejecuta en el arranque del API. Mientras el rol
-- de conexion fue superusuario eso funciono, y por eso nadie lo noto.
--
-- Con RLS parcial activado el API se conecta como `nelvyon_app`, que NO tiene
-- CREATE sobre `public` — a proposito: el esquema es de las migraciones, no del
-- arranque. Desde ese momento `create_all` no puede crear nada, asi que:
--
--   * produccion sigue bien, porque las 42 ya existen de antes;
--   * una base construida SOLO con migraciones se queda sin ellas;
--   * y el dia que se añada un modelo nuevo sin migracion, el arranque falla con
--     `permission denied for schema public` en vez de crearla en silencio.
--
-- Esta migracion cierra la brecha: reproduce el esquema que ya existe para que
-- una base nueva sea igual que produccion.
--
-- DE DONDE SALE ESTE DDL
-- ----------------------
-- No esta escrito a mano ni adivinado. Se compilo el MISMO metadata de
-- SQLAlchemy que hasta ahora creaba estas tablas, para el dialecto PostgreSQL, y
-- se envolvio en `IF NOT EXISTS`. Es, literalmente, lo que `create_all` venia
-- ejecutando.
--
-- QUE NO INCLUYE, Y POR QUE
-- -------------------------
-- Se excluyen `oauth_tokens` y `onboarding_progress`. Sus modelos existen, pero
-- las tablas NO estan en produccion: el arranque nunca las creo porque esos
-- modulos no llegan a importarse. Crearlas aqui seria AÑADIR esquema nuevo, que
-- es otra decision y no la de cerrar esta deuda. Quedan anotadas: el codigo que
-- las menciona fallaria hoy si se ejecutara.
--
-- Se incluyen `workflow_executions`, `voice_pilot_inbound` y `voice_pilot_usage`
-- aunque ningun router o servicio las referencia. El criterio es reproducir
-- produccion, no depurarla: borrar tablas existentes es una operacion destructiva
-- que necesita su propia decision y su propia ventana.
--
-- ADITIVA E IDEMPOTENTE
-- ---------------------
-- Solo `CREATE ... IF NOT EXISTS`. No altera columnas, no borra, no migra datos.
-- En produccion es un no-op comprobable: las 42 ya estan. Reaplicarla no falla.
--
-- NO REQUIERE QUE `nelvyon_app` TENGA CREATE
-- ------------------------------------------
-- Las migraciones las ejecuta el servicio web con su credencial de siempre, que
-- si tiene privilegios de esquema. El API nunca ejecuta este fichero.

CREATE TABLE IF NOT EXISTS activities (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	contact_id INTEGER, 
	deal_id INTEGER, 
	type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	description VARCHAR, 
	is_completed BOOLEAN, 
	due_date TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_activities_workspace_id ON activities (workspace_id);

CREATE INDEX IF NOT EXISTS ix_activities_id ON activities (id);

CREATE TABLE IF NOT EXISTS appointments (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	contact_id INTEGER, 
	contact_name VARCHAR, 
	title VARCHAR NOT NULL, 
	description VARCHAR, 
	type VARCHAR, 
	start_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	end_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	status VARCHAR, 
	location VARCHAR, 
	reminder_sent BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_appointments_id ON appointments (id);

CREATE TABLE IF NOT EXISTS automation_jobs (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	client_id INTEGER, 
	client_name VARCHAR, 
	job_type VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	input_data VARCHAR, 
	output_data VARCHAR, 
	output_id INTEGER, 
	project_id INTEGER, 
	source VARCHAR, 
	webhook_id VARCHAR, 
	priority VARCHAR, 
	error_message VARCHAR, 
	processing_time_ms INTEGER, 
	delivered_at VARCHAR, 
	created_at VARCHAR, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_automation_jobs_id ON automation_jobs (id);

CREATE INDEX IF NOT EXISTS ix_automation_jobs_workspace_id ON automation_jobs (workspace_id);

CREATE TABLE IF NOT EXISTS automation_webhooks (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	webhook_key VARCHAR NOT NULL, 
	job_type VARCHAR, 
	is_active BOOLEAN, 
	total_calls INTEGER, 
	last_called_at VARCHAR, 
	created_at VARCHAR, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_automation_webhooks_workspace_id ON automation_webhooks (workspace_id);

CREATE INDEX IF NOT EXISTS ix_automation_webhooks_id ON automation_webhooks (id);

CREATE TABLE IF NOT EXISTS blog_posts (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	title VARCHAR NOT NULL, 
	slug VARCHAR, 
	content VARCHAR, 
	excerpt VARCHAR, 
	category VARCHAR, 
	tags VARCHAR, 
	status VARCHAR, 
	author VARCHAR, 
	featured_image VARCHAR, 
	seo_title VARCHAR, 
	seo_description VARCHAR, 
	views_count INTEGER, 
	published_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_blog_posts_id ON blog_posts (id);

CREATE INDEX IF NOT EXISTS ix_blog_posts_workspace_id ON blog_posts (workspace_id);

CREATE TABLE IF NOT EXISTS campaigns (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	type VARCHAR NOT NULL, 
	status VARCHAR, 
	subject VARCHAR, 
	content VARCHAR, 
	recipients_count INTEGER, 
	sent_count INTEGER, 
	open_count INTEGER, 
	click_count INTEGER, 
	reply_count INTEGER, 
	scheduled_at TIMESTAMP WITH TIME ZONE, 
	contact_id INTEGER, 
	deal_id INTEGER, 
	project_id INTEGER, 
	client_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_campaigns_deal_id ON campaigns (deal_id);

CREATE INDEX IF NOT EXISTS ix_campaigns_client_id ON campaigns (client_id);

CREATE INDEX IF NOT EXISTS ix_campaigns_contact_id ON campaigns (contact_id);

CREATE INDEX IF NOT EXISTS ix_campaigns_project_id ON campaigns (project_id);

CREATE INDEX IF NOT EXISTS ix_campaigns_workspace_id ON campaigns (workspace_id);

CREATE INDEX IF NOT EXISTS ix_campaigns_id ON campaigns (id);

CREATE TABLE IF NOT EXISTS connector_configs (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	connector_name VARCHAR NOT NULL, 
	display_name VARCHAR, 
	status VARCHAR, 
	config_json VARCHAR, 
	last_sync_at TIMESTAMP WITH TIME ZONE, 
	sync_status VARCHAR, 
	events_count INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_connector_configs_id ON connector_configs (id);

CREATE INDEX IF NOT EXISTS ix_connector_configs_workspace_id ON connector_configs (workspace_id);

CREATE TABLE IF NOT EXISTS contract_logs (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	contract_id INTEGER NOT NULL, 
	action VARCHAR NOT NULL, 
	field_changed VARCHAR, 
	old_value VARCHAR, 
	new_value VARCHAR, 
	actor_name VARCHAR, 
	actor_role VARCHAR, 
	ip_address VARCHAR, 
	notes VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_contract_logs_id ON contract_logs (id);

CREATE TABLE IF NOT EXISTS contracts (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	title VARCHAR NOT NULL, 
	contract_type VARCHAR, 
	client_name VARCHAR, 
	company_name VARCHAR, 
	content VARCHAR, 
	jurisdiction VARCHAR, 
	language VARCHAR, 
	status VARCHAR, 
	signature_data VARCHAR, 
	price VARCHAR, 
	duration VARCHAR, 
	template_id VARCHAR, 
	audit_trail VARCHAR, 
	client_id INTEGER, 
	project_id INTEGER, 
	output_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_contracts_project_id ON contracts (project_id);

CREATE INDEX IF NOT EXISTS ix_contracts_id ON contracts (id);

CREATE INDEX IF NOT EXISTS ix_contracts_workspace_id ON contracts (workspace_id);

CREATE INDEX IF NOT EXISTS ix_contracts_client_id ON contracts (client_id);

CREATE INDEX IF NOT EXISTS ix_contracts_output_id ON contracts (output_id);

CREATE TABLE IF NOT EXISTS conversations (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	contact_id INTEGER, 
	contact_name VARCHAR NOT NULL, 
	channel VARCHAR NOT NULL, 
	subject VARCHAR, 
	last_message VARCHAR, 
	last_message_at TIMESTAMP WITH TIME ZONE, 
	status VARCHAR, 
	unread_count INTEGER, 
	priority VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_conversations_id ON conversations (id);

CREATE TABLE IF NOT EXISTS deals (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	contact_id INTEGER, 
	title VARCHAR NOT NULL, 
	value FLOAT, 
	currency VARCHAR, 
	stage VARCHAR NOT NULL, 
	pipeline VARCHAR, 
	probability INTEGER, 
	expected_close TIMESTAMP WITH TIME ZONE, 
	assigned_to VARCHAR, 
	tags VARCHAR, 
	notes VARCHAR, 
	days_in_stage INTEGER, 
	client_id INTEGER, 
	project_id INTEGER, 
	campaign_id INTEGER, 
	contract_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_deals_project_id ON deals (project_id);

CREATE INDEX IF NOT EXISTS ix_deals_id ON deals (id);

CREATE INDEX IF NOT EXISTS ix_deals_workspace_id ON deals (workspace_id);

CREATE INDEX IF NOT EXISTS ix_deals_contract_id ON deals (contract_id);

CREATE INDEX IF NOT EXISTS ix_deals_client_id ON deals (client_id);

CREATE INDEX IF NOT EXISTS ix_deals_campaign_id ON deals (campaign_id);

CREATE TABLE IF NOT EXISTS form_items (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	form_type VARCHAR NOT NULL, 
	status VARCHAR, 
	fields_count INTEGER, 
	responses_count INTEGER, 
	completion_rate INTEGER, 
	conversion_rate FLOAT, 
	avg_time_seconds INTEGER, 
	fields_json VARCHAR, 
	ai_optimized BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_form_items_workspace_id ON form_items (workspace_id);

CREATE INDEX IF NOT EXISTS ix_form_items_id ON form_items (id);

CREATE TABLE IF NOT EXISTS funnel_items (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	funnel_type VARCHAR, 
	status VARCHAR, 
	stages_count INTEGER, 
	stages_json VARCHAR, 
	visitors INTEGER, 
	leads INTEGER, 
	conversions INTEGER, 
	conversion_rate FLOAT, 
	revenue FLOAT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_funnel_items_workspace_id ON funnel_items (workspace_id);

CREATE INDEX IF NOT EXISTS ix_funnel_items_id ON funnel_items (id);

CREATE TABLE IF NOT EXISTS helpdesk_tickets (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	subject VARCHAR NOT NULL, 
	description VARCHAR, 
	status VARCHAR, 
	priority VARCHAR, 
	category VARCHAR, 
	assigned_to VARCHAR, 
	client_name VARCHAR, 
	client_email VARCHAR, 
	channel VARCHAR, 
	resolution_notes VARCHAR, 
	satisfaction_score INTEGER, 
	first_response_minutes INTEGER, 
	client_id INTEGER, 
	project_id INTEGER, 
	output_id INTEGER, 
	contract_id INTEGER, 
	social_post_id INTEGER, 
	campaign_name VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	resolved_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_contract_id ON helpdesk_tickets (contract_id);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_client_id ON helpdesk_tickets (client_id);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_id ON helpdesk_tickets (id);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_output_id ON helpdesk_tickets (output_id);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_workspace_id ON helpdesk_tickets (workspace_id);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_social_post_id ON helpdesk_tickets (social_post_id);

CREATE INDEX IF NOT EXISTS ix_helpdesk_tickets_project_id ON helpdesk_tickets (project_id);

CREATE TABLE IF NOT EXISTS messages (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	conversation_id INTEGER NOT NULL, 
	sender_type VARCHAR, 
	sender_name VARCHAR, 
	content VARCHAR NOT NULL, 
	channel VARCHAR, 
	status VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_messages_workspace_id ON messages (workspace_id);

CREATE INDEX IF NOT EXISTS ix_messages_id ON messages (id);

CREATE TABLE IF NOT EXISTS nelvyon_agents (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	agent_id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	codename VARCHAR, 
	description VARCHAR, 
	long_description VARCHAR, 
	color VARCHAR, 
	gradient VARCHAR, 
	icon_name VARCHAR, 
	status VARCHAR, 
	uptime VARCHAR, 
	tasks_completed INTEGER, 
	tasks_today INTEGER, 
	success_rate FLOAT, 
	functionality_level VARCHAR, 
	functionality_note VARCHAR, 
	capabilities VARCHAR, 
	metrics VARCHAR, 
	recent_tasks VARCHAR, 
	logs VARCHAR, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_agents_workspace_id ON nelvyon_agents (workspace_id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_agents_id ON nelvyon_agents (id);

CREATE TABLE IF NOT EXISTS nelvyon_assets (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	client_id INTEGER NOT NULL, 
	asset_type VARCHAR NOT NULL, 
	file_name VARCHAR NOT NULL, 
	object_key VARCHAR, 
	file_size INTEGER, 
	mime_type VARCHAR, 
	classification VARCHAR, 
	dimensions VARCHAR, 
	tags VARCHAR, 
	visibility VARCHAR, 
	project_id INTEGER, 
	output_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_assets_id ON nelvyon_assets (id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_assets_output_id ON nelvyon_assets (output_id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_assets_workspace_id ON nelvyon_assets (workspace_id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_assets_project_id ON nelvyon_assets (project_id);

CREATE TABLE IF NOT EXISTS nelvyon_bot_templates (
	id SERIAL NOT NULL, 
	template_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	description VARCHAR, 
	category VARCHAR, 
	channels VARCHAR, 
	rating FLOAT, 
	uses INTEGER, 
	icon_name VARCHAR, 
	color VARCHAR, 
	features VARCHAR, 
	is_active BOOLEAN, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_bot_templates_id ON nelvyon_bot_templates (id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_bot_templates_workspace_id ON nelvyon_bot_templates (workspace_id);

CREATE TABLE IF NOT EXISTS nelvyon_outputs (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	project_id INTEGER NOT NULL, 
	client_id INTEGER, 
	output_type VARCHAR NOT NULL, 
	title VARCHAR, 
	content VARCHAR, 
	qa_score INTEGER, 
	qa_status VARCHAR, 
	qa_feedback VARCHAR, 
	qa_attempts INTEGER, 
	version INTEGER, 
	extra_data VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_outputs_id ON nelvyon_outputs (id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_outputs_workspace_id ON nelvyon_outputs (workspace_id);

CREATE TABLE IF NOT EXISTS nelvyon_products (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	project_id INTEGER NOT NULL, 
	client_id INTEGER, 
	name VARCHAR NOT NULL, 
	description VARCHAR, 
	benefits VARCHAR, 
	specs VARCHAR, 
	price FLOAT, 
	currency VARCHAR, 
	category VARCHAR, 
	images VARCHAR, 
	status VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_products_id ON nelvyon_products (id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_products_workspace_id ON nelvyon_products (workspace_id);

CREATE TABLE IF NOT EXISTS nelvyon_projects (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	client_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	project_type VARCHAR NOT NULL, 
	status VARCHAR, 
	progress INTEGER, 
	brief VARCHAR, 
	deliverables VARCHAR, 
	deadline VARCHAR, 
	priority VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_projects_id ON nelvyon_projects (id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_projects_workspace_id ON nelvyon_projects (workspace_id);

CREATE TABLE IF NOT EXISTS nelvyon_quality_metrics (
	id SERIAL NOT NULL, 
	service_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	service_name VARCHAR NOT NULL, 
	category VARCHAR, 
	score INTEGER, 
	has_backend BOOLEAN, 
	has_ai BOOLEAN, 
	has_crud BOOLEAN, 
	has_real_data BOOLEAN, 
	uptime FLOAT, 
	response_time INTEGER, 
	description VARCHAR, 
	real_features VARCHAR, 
	limitations VARCHAR, 
	route VARCHAR, 
	last_checked VARCHAR, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_quality_metrics_workspace_id ON nelvyon_quality_metrics (workspace_id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_quality_metrics_id ON nelvyon_quality_metrics (id);

CREATE TABLE IF NOT EXISTS nelvyon_user_settings (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	display_name VARCHAR, 
	role VARCHAR, 
	two_fa_enabled BOOLEAN, 
	notification_new_clients BOOLEAN, 
	notification_qa_complete BOOLEAN, 
	notification_deploys BOOLEAN, 
	notification_errors BOOLEAN, 
	notification_weekly_email BOOLEAN, 
	theme_id VARCHAR, 
	custom_theme_json VARCHAR, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_user_settings_workspace_id ON nelvyon_user_settings (workspace_id);

CREATE INDEX IF NOT EXISTS ix_nelvyon_user_settings_id ON nelvyon_user_settings (id);

CREATE TABLE IF NOT EXISTS oidc_states (
	id SERIAL NOT NULL, 
	state VARCHAR(255) NOT NULL, 
	nonce VARCHAR(255) NOT NULL, 
	code_verifier VARCHAR(255) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_oidc_states_id ON oidc_states (id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_oidc_states_state ON oidc_states (state);

CREATE TABLE IF NOT EXISTS partner_records (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	partner_name VARCHAR NOT NULL, 
	company VARCHAR, 
	email VARCHAR, 
	tier VARCHAR, 
	status VARCHAR, 
	referrals_count INTEGER, 
	conversions_count INTEGER, 
	revenue_generated FLOAT, 
	commission_rate FLOAT, 
	commission_earned FLOAT, 
	joined_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_partner_records_workspace_id ON partner_records (workspace_id);

CREATE INDEX IF NOT EXISTS ix_partner_records_id ON partner_records (id);

CREATE TABLE IF NOT EXISTS pipeline_deals (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	company VARCHAR, 
	value FLOAT, 
	probability INTEGER, 
	stage VARCHAR NOT NULL, 
	owner VARCHAR, 
	tags VARCHAR, 
	days_in_stage INTEGER, 
	last_activity VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_pipeline_deals_id ON pipeline_deals (id);

CREATE INDEX IF NOT EXISTS ix_pipeline_deals_workspace_id ON pipeline_deals (workspace_id);

CREATE TABLE IF NOT EXISTS platform_metrics (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	metric_type VARCHAR NOT NULL, 
	module_name VARCHAR NOT NULL, 
	endpoint VARCHAR, 
	latency_ms INTEGER, 
	status VARCHAR, 
	status_code INTEGER, 
	is_ai BOOLEAN, 
	extra_data VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_platform_metrics_id ON platform_metrics (id);

CREATE TABLE IF NOT EXISTS presentation_history (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	title VARCHAR NOT NULL, 
	pres_type VARCHAR, 
	client_name VARCHAR, 
	client_sector VARCHAR, 
	slides_count INTEGER, 
	language VARCHAR, 
	slides_json VARCHAR, 
	status VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_presentation_history_id ON presentation_history (id);

CREATE INDEX IF NOT EXISTS ix_presentation_history_workspace_id ON presentation_history (workspace_id);

CREATE TABLE IF NOT EXISTS pricing_promos (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	promo_type VARCHAR, 
	discount_percent INTEGER, 
	code VARCHAR, 
	plan_id VARCHAR, 
	billing_cycle VARCHAR, 
	active BOOLEAN, 
	valid_from VARCHAR, 
	valid_until VARCHAR, 
	created_at VARCHAR, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_pricing_promos_id ON pricing_promos (id);

CREATE TABLE IF NOT EXISTS report_items (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	report_type VARCHAR, 
	status VARCHAR, 
	data_json VARCHAR, 
	metrics_json VARCHAR, 
	period VARCHAR, 
	generated_by VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_report_items_workspace_id ON report_items (workspace_id);

CREATE INDEX IF NOT EXISTS ix_report_items_id ON report_items (id);

CREATE TABLE IF NOT EXISTS revenue_records (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	source VARCHAR, 
	amount FLOAT NOT NULL, 
	currency VARCHAR, 
	period VARCHAR, 
	period_type VARCHAR, 
	client_name VARCHAR, 
	plan_id VARCHAR, 
	notes VARCHAR, 
	recorded_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_revenue_records_id ON revenue_records (id);

CREATE INDEX IF NOT EXISTS ix_revenue_records_workspace_id ON revenue_records (workspace_id);

CREATE TABLE IF NOT EXISTS sales_records (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	client_name VARCHAR NOT NULL, 
	product VARCHAR, 
	amount FLOAT NOT NULL, 
	currency VARCHAR, 
	status VARCHAR, 
	payment_method VARCHAR, 
	invoice_number VARCHAR, 
	notes VARCHAR, 
	closed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_sales_records_workspace_id ON sales_records (workspace_id);

CREATE INDEX IF NOT EXISTS ix_sales_records_id ON sales_records (id);

CREATE TABLE IF NOT EXISTS security_events (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	event_type VARCHAR NOT NULL, 
	severity VARCHAR, 
	source VARCHAR, 
	description VARCHAR, 
	status VARCHAR, 
	details_json VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_security_events_id ON security_events (id);

CREATE TABLE IF NOT EXISTS segment_results (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	total_contacts INTEGER, 
	segments_count INTEGER, 
	top_segment VARCHAR, 
	data_quality_score INTEGER, 
	result_json VARCHAR, 
	contacts_json VARCHAR, 
	status VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_segment_results_id ON segment_results (id);

CREATE INDEX IF NOT EXISTS ix_segment_results_workspace_id ON segment_results (workspace_id);

CREATE TABLE IF NOT EXISTS user_roles (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	email VARCHAR, 
	role VARCHAR NOT NULL, 
	permissions_json VARCHAR, 
	assigned_by VARCHAR, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_user_roles_id ON user_roles (id);

CREATE TABLE IF NOT EXISTS users (
	id VARCHAR(255) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	name VARCHAR(255), 
	role VARCHAR(50) NOT NULL, 
	language VARCHAR(8) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	last_login TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);

CREATE TABLE IF NOT EXISTS voice_pilot_inbound (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	ticket_id INTEGER NOT NULL, 
	storage_key VARCHAR(64) NOT NULL, 
	content_type VARCHAR(128) NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_voice_pilot_inbound_workspace_id ON voice_pilot_inbound (workspace_id);

CREATE INDEX IF NOT EXISTS ix_voice_pilot_inbound_ticket_id ON voice_pilot_inbound (ticket_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_voice_pilot_inbound_storage_key ON voice_pilot_inbound (storage_key);

CREATE TABLE IF NOT EXISTS voice_pilot_usage (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	period_yyyymm INTEGER NOT NULL, 
	inbound_count INTEGER NOT NULL, 
	synth_count INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_voice_pilot_usage_ws_period UNIQUE (workspace_id, period_yyyymm)
);

CREATE INDEX IF NOT EXISTS ix_voice_pilot_usage_workspace_id ON voice_pilot_usage (workspace_id);

CREATE TABLE IF NOT EXISTS website_items (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	domain VARCHAR, 
	template VARCHAR, 
	status VARCHAR, 
	pages_count INTEGER, 
	visits INTEGER, 
	ssl_enabled BOOLEAN, 
	seo_score INTEGER, 
	performance_score INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_website_items_id ON website_items (id);

CREATE INDEX IF NOT EXISTS ix_website_items_workspace_id ON website_items (workspace_id);

CREATE TABLE IF NOT EXISTS website_pages (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	website_id INTEGER NOT NULL, 
	page_name VARCHAR NOT NULL, 
	slug VARCHAR, 
	sections_json VARCHAR, 
	seo_title VARCHAR, 
	seo_description VARCHAR, 
	seo_keywords VARCHAR, 
	is_published BOOLEAN, 
	sort_order INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_website_pages_id ON website_pages (id);

CREATE TABLE IF NOT EXISTS workflow_executions (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	rule_id INTEGER NOT NULL, 
	rule_name VARCHAR, 
	trigger_type VARCHAR NOT NULL, 
	trigger_data VARCHAR, 
	action_type VARCHAR NOT NULL, 
	action_result VARCHAR, 
	status VARCHAR NOT NULL, 
	error_message VARCHAR, 
	executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_workflow_executions_workspace_id ON workflow_executions (workspace_id);

CREATE INDEX IF NOT EXISTS ix_workflow_executions_id ON workflow_executions (id);

CREATE TABLE IF NOT EXISTS workflow_rules (
	id SERIAL NOT NULL, 
	user_id VARCHAR NOT NULL, 
	workspace_id INTEGER, 
	name VARCHAR NOT NULL, 
	description VARCHAR, 
	trigger_type VARCHAR NOT NULL, 
	trigger_config VARCHAR, 
	action_type VARCHAR NOT NULL, 
	action_config VARCHAR, 
	is_active BOOLEAN NOT NULL, 
	runs_count INTEGER NOT NULL, 
	last_run_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_workflow_rules_id ON workflow_rules (id);

CREATE INDEX IF NOT EXISTS ix_workflow_rules_workspace_id ON workflow_rules (workspace_id);

-- ── privilegios de barrido sobre las tablas que acaba de crear este fichero ──
--
-- POR QUE VA AQUI Y NO SE QUEDO EN LA 544
-- ---------------------------------------
-- La 544 concede a `nelvyon_jobs` los privilegios minimos de sus caminos, y para
-- no fallar en entornos parciales SALTA con un WARNING las tablas que no
-- encuentra. `campaigns` era una de ellas: no existia porque la creaba
-- `create_all` al arrancar, no una migracion.
--
-- Al crear aqui esas tablas, el orden importa: la 544 ya paso. Sin este bloque,
-- una base nueva tendria `campaigns` pero `nelvyon_jobs` no podria leerla, y los
-- barridos de fine-tuning e informes se quedarian sin datos SIN DAR ERROR — que
-- es justo la clase de fallo que esta fase entera se dedico a eliminar.
--
-- Se reafirma la matriz completa de la 544, no solo `campaigns`: un GRANT
-- repetido es gratis, y asi este fichero no depende de recordar cual falto.

DO $bloque_privilegios_tras_crear$
DECLARE
    v_tabla text;
    v_lectura text[] := ARRAY[
        'campaigns', 'chatbot_conversations', 'crm_contacts', 'crm_deals',
        'public_analytics_events', 'tickets', 'ticket_messages',
        'workspaces', 'workspace_members', 'social_accounts', 'social_post_analytics'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '545: sin rol nelvyon_jobs; nada que conceder';
        RETURN;
    END IF;

    FOREACH v_tabla IN ARRAY v_lectura LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NOT NULL THEN
            EXECUTE format('GRANT SELECT ON public.%I TO nelvyon_jobs', v_tabla);
        END IF;
    END LOOP;

    RAISE NOTICE '545: privilegios de lectura de barrido reafirmados';
END
$bloque_privilegios_tras_crear$;
