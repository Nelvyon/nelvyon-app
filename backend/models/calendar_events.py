from core.database import Base
from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB, UUID

#: PostgreSQL es el motor real; SQLite solo sostiene la suite de tests y no sabe
#: renderizar `JSONB` ni `UUID`. `with_variant` deja el tipo exacto donde importa
#: y uno equivalente donde solo hace falta que compile.
_JSONB = JSONB().with_variant(JSON(), "sqlite")
_UUID = UUID(as_uuid=False).with_variant(String(36), "sqlite")


class Calendar_events(Base):
    """Eventos de calendario, incluida la sincronizacion con Google.

    ESTE MODELO DESCRIBIA OTRA TABLA
    --------------------------------
    Declaraba `id INTEGER`, `workspace_id`, `start_time`, `end_time`, `status` y
    `channel`. La tabla que existe —la crea la migracion 408 y la comprobacion
    manual en produccion lo confirmo— tiene `id uuid`, `tenant_id uuid` con clave
    foranea a `saas_tenants`, y `event_date`/`type` obligatorias. Ninguna
    consulta del ORM podia funcionar: fallaba con
    `operator does not exist: uuid = integer`.

    Se alinea con la tabla real. En produccion estaba VACIA, asi que no hay datos
    que migrar. Es ademas la forma que consulta el dashboard SaaS de `apps/web`,
    que si es un consumidor vivo.

    EL INQUILINO AQUI ES UUID
    -------------------------
    A diferencia de `social_posts` —donde `tenant_id` es entero y guarda el
    workspace— aqui hay que traducir por `saas_tenants.workspace_id`. Para eso
    esta `core.tenant_bridge`.
    """

    __tablename__ = "calendar_events"
    __table_args__ = {"extend_existing": True}

    id = Column(_UUID, primary_key=True, index=True, nullable=False)
    tenant_id = Column(_UUID, nullable=False, index=True)
    title = Column(Text, nullable=False)
    #: La tabla tiene un CHECK: appointment | campaign | task | deadline | reminder.
    type = Column(Text, nullable=False, default="appointment")
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    color = Column(Text, nullable=True)
    contact_id = Column(_UUID, nullable=True)
    deal_id = Column(_UUID, nullable=True)
    campaign_id = Column(_UUID, nullable=True)
    assigned_to = Column(_UUID, nullable=True)
    completed = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    # Columnas de sincronizacion con Google, anadidas por migraciones
    # posteriores para `services/calendar_service.py`.
    google_event_id = Column(Text, nullable=True)
    calendar_id = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
    attendees = Column(_JSONB, nullable=False, default=list)
    meet_link = Column(Text, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=True)
