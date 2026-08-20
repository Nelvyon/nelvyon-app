from core.database import Base
from sqlalchemy import Column, Index, Integer, String, text


class Workspace_members(Base):
    __tablename__ = "workspace_members"
    # Una persona, una pertenencia por workspace.
    #
    # La restriccion la crea la migracion 550 en PostgreSQL, y hace falta
    # declararla tambien aqui: la suite corre sobre SQLite construido con
    # `create_all`, y sin ella `ON CONFLICT (workspace_id, user_id)` no encuentra
    # a que acogerse. Es la misma leccion de siempre — el modelo tiene que decir
    # lo mismo que el esquema.
    #
    # Es PARCIAL: una invitacion aun sin aceptar no tiene `user_id` —se guarda
    # vacio— y varias invitaciones pendientes en el mismo workspace son
    # legitimas. Una restriccion total las habria roto, y lo descubrio la bateria
    # de tope de asientos.
    __table_args__ = (
        Index(
            "uq_workspace_members_ws_user", "workspace_id", "user_id",
            unique=True,
            sqlite_where=text("user_id IS NOT NULL AND user_id != ''"),
            postgresql_where=text("user_id IS NOT NULL AND user_id != ''"),
        ),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    user_id = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=False)
    status = Column(String, nullable=False)
    invited_by = Column(String, nullable=True)
    joined_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)