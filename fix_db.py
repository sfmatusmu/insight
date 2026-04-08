import asyncio
from backend.db.database import AsyncSessionLocal
from sqlalchemy import text

async def fix():
    async with AsyncSessionLocal() as session:
        await session.execute(text("UPDATE usuarios SET id_rol = 3 WHERE id_rol IS NULL"))
        await session.commit()
        print("Se ha arreglado la Base de Datos donde id_rol es NULL!")

if __name__ == "__main__":
    asyncio.run(fix())
