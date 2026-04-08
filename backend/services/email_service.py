import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from backend.core.config import settings

logger = logging.getLogger(__name__)

def send_welcome_email(user_email: str, user_name: str, plain_password: str):
    """
    Envía un correo con las credenciales al nuevo usuario mediante SMTP (Gmail).
    """
    
    sender_email = "insight360.cl@gmail.com"
    # IMPORTANTE: Esta contraseña debe configurarse a nivel de entorno/OS como SMTP_PASSWORD
    # Debe ser una "Contraseña de Aplicación" de Google, NO la clave regular del correo. 
    # Para desarrollo, si no existe la variable, informaremos al logger.
    smtp_password = os.getenv("SMTP_PASSWORD") or "Printsave1982$"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
        <h2 style="color: #00E5FF; background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px;">
            ¡Bienvenido a Insight360!
        </h2>
        
        <p>Hola <strong>{user_name}</strong>,</p>
        <p>Tu cuenta corporativa ha sido creada exitosamente. A continuación encontrarás tus credenciales de acceso a la plataforma:</p>
        
        <div style="background-color: #f1f3f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>URL de Acceso:</strong> <a href="http://localhost:8080/auth/login.html" style="color: #007bff; text-decoration: none;">Acceder a Insight360</a></p>
            <p style="margin: 10px 0 0 0;"><strong>Correo / Usuario:</strong> {user_email}</p>
            <p style="margin: 10px 0 0 0;"><strong>Contraseña temporal:</strong> <span style="background-color: #fff; padding: 2px 6px; border: 1px solid #ccc; font-family: monospace;">{plain_password}</span></p>
        </div>
        
        <p>Por favor, asegúrate de guardar estas credenciales de forma segura. Te recomendamos cambiar tu contraseña una vez que ingreses al sistema.</p>
        
        <p style="font-size: 0.9em; color: #6c757d; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px;">
            Saludos cordiales,<br>
            <strong>El Equipo de Insight360</strong>
        </p>
    </body>
    </html>
    """
    
    # 1. Configurar el objeto MIME
    message = MIMEMultipart("alternative")
    message["Subject"] = "Insight360 - Tus Credenciales de Acceso"
    message["From"] = f"Insight360 <{sender_email}>"
    message["To"] = user_email
    
    # 2. Adjuntar el HTML
    part = MIMEText(html_content, "html")
    message.attach(part)
    
    # 3. Conexión SMTP y envío
    try:
        logger.info(f"Conectando a smtp.gmail.com para enviar correo a {user_email}...")
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(sender_email, smtp_password)
            server.sendmail(sender_email, user_email, message.as_string())
            
        logger.info(f"Correo de bienvenida enviado exitosamente a: {user_email}")
        
    except smtplib.SMTPAuthenticationError:
        logger.error(f"Fallo de Autenticación SMTP al intentar enviar a {user_email}. Asegúrate de usar una 'Contraseña de Aplicación' de Google y no la clave de cuenta normal.")
    except Exception as e:
        logger.error(f"Error inesperado al enviar correo SMTP a {user_email}: {e}")
