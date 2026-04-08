import os
import glob

def fix_html_files():
    files = glob.glob('frontend/app/*.html')
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Fix Dropdown Navbar Name
        content = content.replace(
            '<span class="text-dark fw-bold d-none d-md-inline">Sergio Matus</span>',
            '<span class="text-dark fw-bold d-none d-md-inline nav-user-name">Sergio Matus</span>'
        )
        
        # Fix Dropdown Menu Name
        content = content.replace(
            '<h5 class="fw-bold mb-0">Sergio Matus</h5>',
            '<h5 class="fw-bold mb-0 nav-user-name">Sergio Matus</h5>'
        )
        
        # Fix Dropdown Menu Role
        content = content.replace(
            '<small>Administrador</small>',
            '<small class="nav-user-role">Administrador</small>'
        )

        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
            
    print(f"Fixed {len(files)} files.")

if __name__ == '__main__':
    fix_html_files()
