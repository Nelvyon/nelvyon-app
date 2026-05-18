"""Patch nelvyon_* routers: WS read, OP write, workspace_id in service calls, remove /all."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1] / "routers"

SPECS = [
    ("nelvyon_assets", "Nelvyon_assets", "Nelvyon_assets"),
    ("nelvyon_clients", "Nelvyon_clients", "Nelvyon_clients"),
    ("nelvyon_products", "Nelvyon_products", "Nelvyon_products"),
    ("nelvyon_user_settings", "Nelvyon_user_settings", "Nelvyon_user_settings"),
]


def patch_file(slug: str, title: str, model: str) -> None:
    p = ROOT / f"{slug}.py"
    t = p.read_text(encoding="utf-8")
    t = t.replace(
        "from dependencies.workspace import WorkspaceContext, require_workspace_operator",
        "from dependencies.workspace import (\n    WorkspaceContext,\n    require_workspace,\n    require_workspace_operator,\n)",
    )
    t = re.sub(
        rf"router = APIRouter\(\s*prefix=\"/api/v1/entities/{slug}\",\s*tags=\[\"{slug}\"\],\s*dependencies=\[Depends\(require_workspace_operator\)\],\s*\)",
        f'router = APIRouter(prefix="/api/v1/entities/{slug}", tags=["{slug}"])',
        t,
        flags=re.DOTALL,
    )
    resp = f"class {title}Response(BaseModel):"
    if f"workspace_id: Optional[int] = None" not in t.split(resp, 1)[1][:400]:
        t = t.replace(
            f"class {title}Response(BaseModel):\n    \"\"\"Entity response schema\"\"\"\n    id: int\n    user_id: str",
            f"class {title}Response(BaseModel):\n    \"\"\"Entity response schema\"\"\"\n    id: int\n    user_id: str\n    workspace_id: Optional[int] = None",
        )
    t = t.replace(
        "ws_ctx: WorkspaceContext = Depends(require_workspace_operator),\n    db: AsyncSession = Depends(get_db),\n):\n    \"\"\"Query",
        "ws_ctx: WorkspaceContext = Depends(require_workspace),\n    db: AsyncSession = Depends(get_db),\n):\n    \"\"\"Query",
        1,
    )
    t = t.replace(
        "user_id=str(ws_ctx.user_id),\n        )",
        "user_id=str(ws_ctx.user_id),\n            workspace_id=ws_ctx.workspace_id,\n        )",
        1,
    )
    # remove /all block
    pat = re.compile(
        rf"@router\.get\(\"/all\".*?raise HTTPException\(status_code=500, detail=f\"Internal server error: {{str\(e\)}}\"\)\n\n",
        re.DOTALL,
    )
    t, n = pat.subn("\n", t, count=1)
    if n != 1:
        raise RuntimeError(f"{slug}: /all block not removed (n={n})")
    t = t.replace(
        "ws_ctx: WorkspaceContext = Depends(require_workspace_operator),\n    db: AsyncSession = Depends(get_db),\n):\n    \"\"\"Get a single",
        "ws_ctx: WorkspaceContext = Depends(require_workspace),\n    db: AsyncSession = Depends(get_db),\n):\n    \"\"\"Get a single",
        1,
    )
    t = t.replace(
        f"await service.get_by_id(id, user_id=str(ws_ctx.user_id))",
        f"await service.get_by_id(id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id)",
        1,
    )
    t = t.replace(
        "await service.create(data.model_dump(), user_id=str(ws_ctx.user_id))",
        "await service.create(\n            data.model_dump(),\n            user_id=str(ws_ctx.user_id),\n            workspace_id=ws_ctx.workspace_id,\n        )",
        1,
    )
    t = t.replace(
        "await service.create(item_data.model_dump(), user_id=str(ws_ctx.user_id))",
        "await service.create(\n                item_data.model_dump(),\n                user_id=str(ws_ctx.user_id),\n                workspace_id=ws_ctx.workspace_id,\n            )",
        1,
    )
    if "except ValueError as e:\n        await db.rollback()\n        raise HTTPException(status_code=400, detail=str(e))" not in t:
        t = t.replace(
            "        return results\n    except Exception as e:\n        await db.rollback()\n        logger.error(f\"Error in batch create:",
            "        return results\n    except ValueError as e:\n        await db.rollback()\n        raise HTTPException(status_code=400, detail=str(e))\n    except Exception as e:\n        await db.rollback()\n        logger.error(f\"Error in batch create:",
            1,
        )
        t = t.replace(
            "        return results\n    except Exception as e:\n        await db.rollback()\n        logger.error(f\"Error in batch update:",
            "        return results\n    except ValueError as e:\n        await db.rollback()\n        raise HTTPException(status_code=400, detail=str(e))\n    except Exception as e:\n        await db.rollback()\n        logger.error(f\"Error in batch update:",
            1,
        )
    t = t.replace(
        "await service.update(item.id, update_dict, user_id=str(ws_ctx.user_id))",
        "await service.update(\n                item.id,\n                update_dict,\n                user_id=str(ws_ctx.user_id),\n                workspace_id=ws_ctx.workspace_id,\n            )",
        1,
    )
    t = t.replace(
        "await service.update(id, update_dict, user_id=str(ws_ctx.user_id))",
        "await service.update(\n            id,\n            update_dict,\n            user_id=str(ws_ctx.user_id),\n            workspace_id=ws_ctx.workspace_id,\n        )",
        1,
    )
    t = t.replace(
        "await service.delete(item_id, user_id=str(ws_ctx.user_id))",
        "await service.delete(\n                item_id,\n                user_id=str(ws_ctx.user_id),\n                workspace_id=ws_ctx.workspace_id,\n            )",
        1,
    )
    t = t.replace(
        "await service.delete(id, user_id=str(ws_ctx.user_id))",
        "await service.delete(\n            id, user_id=str(ws_ctx.user_id), workspace_id=ws_ctx.workspace_id\n        )",
        1,
    )
    p.write_text(t, encoding="utf-8")
    print("patched", slug)


def main() -> None:
    for slug, title, model in SPECS:
        patch_file(slug, title, model)


if __name__ == "__main__":
    main()
