from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.database import get_db
from backend.schemas.user import User, UserCreate, UserUpdate
import backend.crud.crud_user as crud_user
from backend.services.email_service import send_welcome_email

router = APIRouter()

@router.get("/", response_model=List[User])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Recuperar listar usuarios.
    """
    users = await crud_user.user.get_multi(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    background_tasks: BackgroundTasks
) -> Any:
    """
    Crear nuevo usuario y enviar contraseña por correo.
    """
    user = await crud_user.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con este correo electronico en el sistema.",
        )
    user = await crud_user.user.create(db, obj_in=user_in)
    background_tasks.add_task(send_welcome_email, user_in.email, user_in.nombres, user_in.password)
    return user


# ──── IMPORTANTE: /toggle DEBE ir ANTES de /{id} ────────────────────────────
@router.patch("/{id}/toggle", response_model=User)
async def toggle_user_status(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    """
    Cambia el estado de un usuario entre Activo (1) e Inactivo (2).
    No se puede desactivar al Administrador principal (ID 1).
    """
    if id == 1:
        raise HTTPException(
            status_code=403,
            detail="No se puede desactivar al Administrador principal del sistema (ID 1)."
        )

    user = await crud_user.user.get(db, id=id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Invertir estado: 1 → 2 (inactivo), 2 → 1 (activo)
    nuevo_estado = 2 if (user.activo == 1 or user.activo is True) else 1
    user = await crud_user.user.update(db, db_obj=user, obj_in={"activo": nuevo_estado})
    return user


@router.patch("/{id}", response_model=User)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    user_in: UserUpdate,
) -> Any:
    """
    Actualizar usuario existente.
    """
    user = await crud_user.user.get(db, id=id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user = await crud_user.user.update(db, db_obj=user, obj_in=user_in)
    return user

@router.delete("/{id}", response_model=User)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    """
    Eliminar un usuario.
    """
    if id == 1:
        raise HTTPException(
            status_code=403,
            detail="No se puede eliminar al Administrador principal del sistema (ID 1)."
        )

    user = await crud_user.user.get(db, id=id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user = await crud_user.user.remove(db, id=id)
    return user
