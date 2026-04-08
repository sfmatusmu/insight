from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings

# --- Setup Asíncrono (Recomendado para FastAPI) ---
engine = create_async_engine(
    settings.ASYNC_SQLALCHEMY_DATABASE_URI,
    echo=True, # Útil para debuggear queries impresas en la consola
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Inyección de dependencias para FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
