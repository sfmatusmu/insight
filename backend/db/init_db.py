import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.db.base_class import Base
# Asegurar que se importan todos los modelos para que Base.metadata los reconozca
from backend.models.models import Rol, Usuario, Historial, Auditoria, Notificacion, Archivo, UsuarioArchivo, ArchivoETL, Analisis, Resultado
from backend.core.security import get_password_hash

def init_db_and_tables():
    # 1. Crear la base de datos de manera sincrona si no existe
    try:
        connection = pymysql.connect(
            host=settings.MYSQL_SERVER,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            port=int(settings.MYSQL_PORT)
        )
        with connection.cursor() as cursor:
            # Crear Base de Datos
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DB}")
        connection.commit()
    except Exception as e:
        print(f"Error asegurando la base de datos: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()
            
    # 2. Crear las tablas usando SqlAlchemy Sincrono para el arranque
    # (El motor asíncrono tiene advertencias al correr sync en app startup, es ms facil usar el sincrono para DDL)
    sync_engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    Base.metadata.create_all(bind=sync_engine)
    print("Base de datos y tablas comprobadas/creadas con exito.")

    # 3. Inyectar Administrador Maestro
    with Session(sync_engine) as session:
        # Verificar rol 
        rol_admin = session.query(Rol).filter_by(nombre_rol="Administrador").first()
        if not rol_admin:
            rol_admin = Rol(nombre_rol="Administrador", descripcion="Control Total de la Plataforma")
            session.add(rol_admin)
            
        rol_editor = session.query(Rol).filter_by(nombre_rol="Editor").first()
        if not rol_editor:
            rol_editor = Rol(nombre_rol="Editor", descripcion="Manejo de Dataset, sin Gestion de Sistema")
            session.add(rol_editor)
            
        rol_invitado = session.query(Rol).filter_by(nombre_rol="Invitado").first()
        if not rol_invitado:
            rol_invitado = Rol(nombre_rol="Invitado", descripcion="Lectura Unicamente")
            session.add(rol_invitado)
            
        session.commit()
        session.refresh(rol_admin)
        
        # Verificar usuario
        admin_user = session.query(Usuario).filter_by(email="admin@insight360.cl").first()
        if not admin_user:
            admin_user = Usuario(
                id_rol=rol_admin.id_rol,
                nombres="Super",
                apellidoPaterno="Administrador",
                apellidoMaterno="",
                email="admin@insight360.cl",
                username="admin",
                hashed_password=get_password_hash("deltree54"),
                activo=1
            )
            session.add(admin_user)
            session.commit()
            print("Usuario 'admin@insight360.cl' inyectado correctamente en DB.")

if __name__ == "__main__":
    init_db_and_tables()
