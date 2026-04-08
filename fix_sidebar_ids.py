import os
import glob
import re

def fix_sidebar():
    files = glob.glob('frontend/app/*.html')
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Fix Gestión usuarios ID
        # Buscar el <li> que contiene href="gestion_usuarios.html"
        # Si no tiene ya el id="", se lo agregamos.
        
        # Primero quitamos el nav-menu-users si ya estaba para normalizar
        content = re.sub(r'<li class="nav-item"\s+id="nav-menu-users">', '<li class="nav-item">', content)
        content = re.sub(r'<li class="nav-item"\s+id="nav-menu-files">', '<li class="nav-item">', content)
        
        # Ahora inyectamos los ids donde corresponden
        content = content.replace(
            '<li class="nav-item">\n                <a href="gestion_usuarios.html"',
            '<li class="nav-item" id="nav-menu-users">\n                <a href="gestion_usuarios.html"'
        )
        content = content.replace(
             '<li class="nav-item">\n                <a href="gestion_archivos.html"',
             '<li class="nav-item" id="nav-menu-files">\n                <a href="gestion_archivos.html"'
        )
        
        # También existe la posibilidad de que no haya un saldo de línea entre ellos.
        # Fallback con regex:
        content = re.sub(r'<li class="nav-item">\s*<a href="gestion_usuarios.html"', '<li class="nav-item" id="nav-menu-users">\n                <a href="gestion_usuarios.html"', content)
        content = re.sub(r'<li class="nav-item">\s*<a href="gestion_archivos.html"', '<li class="nav-item" id="nav-menu-files">\n                <a href="gestion_archivos.html"', content)

        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)

    print(f"Fixed {len(files)} files.")

if __name__ == '__main__':
    fix_sidebar()
