from fastapi import APIRouter
from backend.api.api_v1.endpoints import users, auth

api_router = APIRouter()
# auth.router expone: POST /login/access-token → /api/v1/login/access-token
#                     GET  /me                  → /api/v1/me
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
