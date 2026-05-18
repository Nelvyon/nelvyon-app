"""
Roles mínimos enterprise (ENTERPRISE-READY-1).

Plataforma (JWT / users.role):
  super_admin — operación plataforma; bypass de membership en workspace (ver workspace.py).
  admin       — administración plataforma (listados globales, stats audit, etc.).
  user        — usuario tenant por defecto (no implica permiso de workspace).

Workspace (X-Workspace-Id + owner / workspace_members):
  owner     — propietario del workspace.
  admin     — administración del workspace (invitaciones, settings de equipo).
  operator  — operaciones CRM / workflows / campañas / inbox operativo (mutaciones).
  member    — colaboración; lectura y tickets; sin mutaciones privilegiadas.
  viewer    — solo lectura.

Compatibilidad: roles de workspace distintos de member/viewer se consideran con permiso
de mutación si están en WORKSPACE_MUTATION_ROLES.
"""
from __future__ import annotations

from typing import FrozenSet, Optional

# Mutaciones sensibles (CUD) en entidades SaaS por workspace
WORKSPACE_MUTATION_ROLES: FrozenSet[str] = frozenset({"owner", "admin", "operator"})


def workspace_can_mutate(role_in_workspace: Optional[str]) -> bool:
    if not role_in_workspace:
        return False
    return str(role_in_workspace).strip().lower() in WORKSPACE_MUTATION_ROLES
