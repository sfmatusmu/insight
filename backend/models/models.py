from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text, Enum
from sqlalchemy.orm import relationship
from backend.db.base_class import Base
from datetime import datetime

class Rol(Base):
    __tablename__ = "rol"
    id_rol = Column(Integer, primary_key=True, index=True)
    nombre_rol = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    usuarios = relationship("Usuario", back_populates="rol")

class Usuario(Base):
    __tablename__ = "usuario"
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombres = Column(String(100), nullable=False)
    apellidoPaterno = Column(String(100), nullable=False)
    apellidoMaterno = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column("contrasena", String(255), nullable=False) # Mapeado a "contrasena" en BD
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    activo = Column(Integer, default=1)  # 1=Activo, 2=Inactivo
    ultima_sesion = Column(DateTime, nullable=True)
    id_rol = Column(Integer, ForeignKey("rol.id_rol"), nullable=True)

    # El campo is_superuser lo mantenemos logico o lo mapeamos a rol
    @property
    def is_superuser(self) -> bool:
        return self.id_rol == 1 # Asumiendo id 1 es admin
    @property
    def is_active(self) -> bool:
        return self.activo == 1  # 1=Activo, 2=Inactivo
    @property
    def full_name(self) -> str:
        return f"{self.nombres} {self.apellidoPaterno}".strip()

    rol = relationship("Rol", back_populates="usuarios")
    historiales = relationship("Historial", back_populates="usuario")
    auditorias = relationship("Auditoria", back_populates="usuario")
    notificaciones = relationship("Notificacion", back_populates="usuario")
    archivos = relationship("Archivo", back_populates="usuario")
    archivos_compartidos = relationship("UsuarioArchivo", back_populates="usuario")
    analisis = relationship("Analisis", back_populates="usuario")

class Historial(Base):
    __tablename__ = "historial"
    id_historial = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    accion = Column(String(255), nullable=False)
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    descripcion = Column(Text, nullable=True)

    usuario = relationship("Usuario", back_populates="historiales")

class Auditoria(Base):
    __tablename__ = "auditoria"
    id_log = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    entidad = Column(String(100), nullable=False)
    id_entidad = Column(Integer, nullable=False)
    accion = Column(String(255), nullable=False)
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    detalle = Column(Text, nullable=True)

    usuario = relationship("Usuario", back_populates="auditorias")

class Notificacion(Base):
    __tablename__ = "notificacion"
    id_notificacion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    tipo = Column(String(50), nullable=False)
    leida = Column(Boolean, default=False)
    fecha_envio = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="notificaciones")

class Archivo(Base):
    __tablename__ = "archivo"
    id_archivo = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False) # Owner
    nombre_archivo = Column(String(255), nullable=False)
    ruta_archivo = Column(String(500), nullable=False)
    tipo_archivo = Column(String(50), nullable=False)
    tamano = Column(Float, nullable=False) # en MB
    porcentaje_valido = Column(Float, nullable=True)
    estado = Column(String(50), nullable=False)
    numero_filas = Column(Integer, nullable=True)

    usuario = relationship("Usuario", back_populates="archivos")
    usuarios_con_acceso = relationship("UsuarioArchivo", back_populates="archivo")
    etl = relationship("ArchivoETL", back_populates="archivo", uselist=False)
    analisis = relationship("Analisis", back_populates="archivo")

class UsuarioArchivo(Base):
    __tablename__ = "usuario_archivos"
    id_archivo = Column(Integer, ForeignKey("archivo.id_archivo"), primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)
    permiso = Column(String(50), nullable=False)
    fecha_compartido = Column(DateTime, default=datetime.utcnow)

    archivo = relationship("Archivo", back_populates="usuarios_con_acceso")
    usuario = relationship("Usuario", back_populates="archivos_compartidos")

class ArchivoETL(Base):
    __tablename__ = "archivo_etl"
    id_etl = Column(Integer, primary_key=True, index=True)
    id_archivo = Column(Integer, ForeignKey("archivo.id_archivo"), nullable=False, unique=True)
    fecha_importado = Column(DateTime, default=datetime.utcnow)
    tamano = Column(Float, nullable=False)
    porcentaje_valido = Column(Float, nullable=True)
    numero_filas = Column(Integer, nullable=True)
    mensaje = Column(Text, nullable=True)
    estado_etl = Column(String(50), nullable=False)

    archivo = relationship("Archivo", back_populates="etl")

class Analisis(Base):
    __tablename__ = "analisis"
    id_analisis = Column(Integer, primary_key=True, index=True)
    id_archivo = Column(Integer, ForeignKey("archivo.id_archivo"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    tipo_analisis = Column(String(100), nullable=False)
    parametros = Column(Text, nullable=True) # JSON o texto
    fecha_ejecucion = Column(DateTime, default=datetime.utcnow)
    estado = Column(String(50), nullable=False)

    archivo = relationship("Archivo", back_populates="analisis")
    usuario = relationship("Usuario", back_populates="analisis")
    resultado = relationship("Resultado", back_populates="analisis", uselist=False)

class Resultado(Base):
    __tablename__ = "resultado"
    id_resultado = Column(Integer, primary_key=True, index=True)
    id_analisis = Column(Integer, ForeignKey("analisis.id_analisis"), nullable=False, unique=True)
    observaciones = Column(Text, nullable=True)
    resumen = Column(Text, nullable=True)
    ruta_resultado = Column(String(500), nullable=True)
    fecha_generacion = Column(DateTime, default=datetime.utcnow)

    analisis = relationship("Analisis", back_populates="resultado")
