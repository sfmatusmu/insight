from datetime import timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.config import settings
from backend.core.security import create_access_token, verify_token
from backend.db.database import get_db
import backend.crud.crud_user as crud_user
from backend.schemas.user import Token, User

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, devuelve el access token.
    """
    user = await crud_user.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Correo electronico o contrasena incorrecta")
    elif not crud_user.user.is_active(user):
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id_usuario, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.get("/me", response_model=User)
async def read_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
) -> Any:
    """
    Retorna el perfil completo del usuario autenticado.
    Valida el JWT del header Authorization: Bearer <token>.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado")

    token = authorization.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user = await crud_user.user.get(db, id=int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not crud_user.user.is_active(user):
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    return user
