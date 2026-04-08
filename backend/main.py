from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.api.api_v1.api import api_router
from backend.db.init_db import init_db_and_tables

# Inicializar Base de Datos (Creará el DB y 10 tablas descritas en el ERD)
init_db_and_tables()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend de Procesamiento y API para Insight360 (Arquitectura Modular)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuramos CORS (Critico para que el Frontend analisis_bi.js se comunique)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/v1/health", tags=["Salud"])
def health_check():
    """
    Endpoint para que el Frontend verifique que el Backend esta encendido.
    """
    return {"status": "ok", "message": "Backend y Base de datos Insight360 Operativos"}

@app.get("/")
def read_root():
    return {"mensaje": "¡Bienvenido! El Servidor Backend Modular de Insight360 está corriendo con éxito y con BD conectada."}

