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

#: Roles que participan del trabajo diario. Excluye SOLO a `viewer`.
#:
#: Existe porque el producto define un escalon intermedio que aqui faltaba. La
#: matriz de `apps/web/src/core/routing/roleMatrix.ts` da `create: "member"` en
#: crm, inbox, campaigns, ads, social, funnels, ecommerce y help, y reserva
#: `operator` para automations, reputacion, os, settings, branding y voice.
#:
#: Sin este conjunto solo habia dos opciones y ambas eran incorrectas para esos
#: modulos: `require_workspace` deja entrar tambien a `viewer` —que el producto
#: define como solo lectura— y `require_workspace_operator` expulsa a `member`,
#: que es justo quien hace ese trabajo. En esos endpoints el agujero nunca fue
#: `member`: era `viewer`.
WORKSPACE_COLLABORATION_ROLES: FrozenSet[str] = WORKSPACE_MUTATION_ROLES | frozenset({"member"})


def _rol(role_in_workspace: Optional[str]) -> str:
    """Normaliza. Un rol vacio o desconocido no pertenece a ningun conjunto."""
    if not role_in_workspace:
        return ""
    return str(role_in_workspace).strip().lower()


def workspace_can_mutate(role_in_workspace: Optional[str]) -> bool:
    return _rol(role_in_workspace) in WORKSPACE_MUTATION_ROLES


def workspace_can_collaborate(role_in_workspace: Optional[str]) -> bool:
    """`viewer` —y cualquier rol no reconocido— queda fuera."""
    return _rol(role_in_workspace) in WORKSPACE_COLLABORATION_ROLES
