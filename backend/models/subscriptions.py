from core.database import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.schema import FetchedValue


class Subscriptions(Base):
    """Subscription billing row; titular is workspace_id.

    user_id: audit trail for who created / initiated checkout (not the billing titular).
    expires_at: legacy end date from the pre-Stripe-period calculation; when migrating,
    current_period_end is the canonical period end from Stripe once integrated.
    """

    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_workspace_id", "workspace_id"),
        {"extend_existing": True},
    )

    # EL TIPO CANONICO ES `uuid`: asi esta la columna en PostgreSQL, con
    # `DEFAULT gen_random_uuid()`, desde que se creo. Declararla `Integer`
    # hacia que el ORM mintiera — al leer entregaba el objeto `UUID` del
    # driver y todo consumidor tipado como entero lo rechazaba.
    #
    # La variante para SQLite no es una segunda opinion sobre el tipo: es una
    # concesion al sustrato de pruebas. Buena parte de la suite inserta con
    # SQL literal sin `id` y se apoya en que SQLite autocomplete la clave, algo
    # que solo hace con `INTEGER PRIMARY KEY`. En PostgreSQL —el unico motor de
    # produccion— la columna es y sigue siendo `uuid`.
    #
    # Sin `default` ni `server_default` en el modelo, a proposito: cada motor
    # genera la clave por su cuenta. PostgreSQL con el `DEFAULT
    # gen_random_uuid()` que la columna ya tiene, SQLite con el autorrelleno de
    # `INTEGER PRIMARY KEY`. Un default de Python devolveria un objeto `UUID`
    # que la variante entera no sabe enlazar.
    #
    # `FetchedValue()` no emite DDL ninguna: solo le dice al ORM que el valor
    # lo pone el motor y que hay que leerlo despues del INSERT. Sin eso,
    # SQLAlchemy solo asume clave autogenerada para enteros y aqui fallaba con
    # `NULL identity key`.
    id = Column(
        Uuid(as_uuid=True).with_variant(Integer(), "sqlite"),
        primary_key=True,
        index=True,
        server_default=FetchedValue(),
        nullable=False,
    )
    user_id = Column(String, nullable=False)
    workspace_id = Column(
        Integer,
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    plan_id = Column(String, nullable=False)
    billing_cycle = Column(String, nullable=False)
    status = Column(String, nullable=False)
    stripe_session_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    amount_paid = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    promo_code = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
