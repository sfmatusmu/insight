import os
import glob

def fix_html_files():
    files = glob.glob('frontend/app/*.html')
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Add Last Session Div directly below the user role in the Dropdown Menu Header
        content = content.replace(
            '<small class="nav-user-role">Administrador</small></li>',
            '<small class="nav-user-role">Administrador</small><div class="nav-user-last-session mt-1 text-white-50" style="font-size: 0.75rem; font-style: italic;">Última sesión: Nunca</div></li>'
        )
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
            
    print(f"Fixed {len(files)} files.")

if __name__ == '__main__':
    fix_html_files()
