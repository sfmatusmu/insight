from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    activo: Optional[int] = None   # 1=Activo, 2=Inactivo
    nombres: Optional[str] = None
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None

# Properties to receive via API on creation
class UserCreate(UserBase):
    id_rol: Optional[int] = 3 # Invitado por defecto
    email: EmailStr
    username: str
    password: str
    nombres: str
    apellidoPaterno: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None
    id_rol: Optional[int] = None

class UserInDBBase(UserBase):
    id_usuario: Optional[int] = None
    id_rol: Optional[int] = None
    ultima_sesion: Optional[datetime] = None
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Additional properties to return via API
class User(UserInDBBase):
    pass

# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
