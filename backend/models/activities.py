from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Index


class Activities(Base):
    __tablename__ = "activities"
    # El indice va tambien aqui, no solo en la migracion 531: esta tabla la
    # crea `create_all` al arrancar, y al migrar desde cero todavia no existe
    # cuando la migracion pasa, asi que 531 la salta.
    __table_args__ = (
        Index("ix_activities_workspace_id", "workspace_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    contact_id = Column(Integer, nullable=True)
    deal_id = Column(Integer, nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_completed = Column(Boolean, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)