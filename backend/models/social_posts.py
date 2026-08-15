from core.database import Base
from sqlalchemy import JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

#: PostgreSQL es el motor real; SQLite solo sostiene la suite de tests y no sabe
#: renderizar `JSONB` ni `UUID`. `with_variant` deja el tipo exacto donde importa
#: y uno equivalente donde solo hace falta que compile.
_JSONB = JSONB().with_variant(JSON(), "sqlite")
_UUID = UUID(as_uuid=False).with_variant(String(36), "sqlite")


class Social_posts(Base):
    """Publicaciones programadas del scheduler social.

    ESTE MODELO DESCRIBIA OTRA TABLA
    --------------------------------
    Declaraba `id INTEGER`, `platform`, `likes`, `impressions`, `client_id`,
    `project_id`... columnas de una generacion anterior del producto. La tabla
    que existe —la crea la migracion 507, y la comprobacion manual en produccion
    lo confirmo— tiene `id uuid`, `tenant_id INTEGER` y campos jsonb. Ninguna
    consulta del ORM podia funcionar contra ella.

    Se alinea con la tabla real. En produccion estaba VACIA, asi que no hay
    datos que migrar.

    NO CONFUNDIR CON `saas_social_posts`
    ------------------------------------
    Esa es otra tabla, de la migracion 420, con `tenant_id UUID` y servicio
    TypeScript propio para la superficie `/saas`. Esta es la del backend Python.

    `tenant_id` ES ENTERO Y ES EL WORKSPACE
    ---------------------------------------
    A diferencia de `calendar_events` o `audit_logs`, aqui no se traduce por
    `saas_tenants`: la columna guarda directamente el `workspace_id`, tal y como
    la usa `finetuning_service` (`WHERE sp.tenant_id = :ws`).
    """

    __tablename__ = "social_posts"
    # El indice del filtro de inquilino lo declara `index=True` en la propia
    # columna; repetirlo aqui creaba dos indices con el mismo nombre.
    __table_args__ = {"extend_existing": True}

    id = Column(_UUID, primary_key=True, index=True, nullable=False)
    tenant_id = Column(Integer, nullable=False, index=True)
    content = Column(Text, nullable=False, default="")
    media_urls = Column(_JSONB, nullable=False, default=list)
    platform_post_ids = Column(_JSONB, nullable=False, default=dict)
    account_ids = Column(_JSONB, nullable=False, default=list)
    post_type = Column(Text, nullable=False, default="text")
    status = Column(Text, nullable=False, default="draft")
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    #: Lo que la generacion anterior guardaba en columnas propias —platform,
    #: campaign_name, client_id, project_id, contract_id— vive aqui. Al alinear
    #: no se perdio nada: se movio a donde la tabla lo admite.
    #: El atributo se llama `post_metadata` porque `metadata` esta reservado por
    #: SQLAlchemy en las clases declarativas; la columna sigue siendo `metadata`.
    post_metadata = Column("metadata", _JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
