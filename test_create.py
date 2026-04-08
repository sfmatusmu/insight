import asyncio
from backend.crud.crud_user import user as crud_user
from backend.schemas.user import UserCreate
from backend.db.database import AsyncSessionLocal

async def test_create():
    user_in = UserCreate(
        email="test22@test.com",
        username="test22",
        password="123",
        nombres="Test",
        apellidoPaterno="Perez",
        apellidoMaterno="H",
        id_rol=2
    )
    async with AsyncSessionLocal() as db:
        try:
            created = await crud_user.create(db, obj_in=user_in)
            print(created.email)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create())
