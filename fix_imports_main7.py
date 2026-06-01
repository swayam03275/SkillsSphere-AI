import os
import re

TARGET_DIR = "client/src"

REPLACEMENTS = [
    # Replace Navbar imports
    (r'([\'"])[\w\.\/]+/shared/landing_components/Navbar([\'"])', r'\1@/shared/components/Navbar\2'),
    (r'([\'"])[\w\.\/]+/shared/landing/Navbar([\'"])', r'\1@/shared/components/Navbar\2'),
    
    # Replace Button imports
    (r'([\'"])[\w\.\/]+/shared/landing_components/Button([\'"])', r'\1@/shared/components/Button\2'),
    (r'([\'"])[\w\.\/]+/shared/landing/Button([\'"])', r'\1@/shared/components/Button\2'),
    
    # Replace Card imports
    (r'([\'"])[\w\.\/]+/shared/landing_components/Card([\'"])', r'\1@/shared/components/Card\2'),
    (r'([\'"])[\w\.\/]+/shared/landing/Card([\'"])', r'\1@/shared/components/Card\2'),
]

# Vite allows absolute imports with @/ meaning src/ in many setups, but if not configured, relative imports are safer.
# However, the user's project likely uses relative imports heavily. 
# A safer regex approach is to replace just the directory portion while keeping the relative prefix!

RELATIVE_REPLACEMENTS = [
    (r'/shared/landing_components/Navbar', r'/shared/components/Navbar'),
    (r'/shared/landing/Navbar', r'/shared/components/Navbar'),
    (r'/shared/landing_components/Button', r'/shared/components/Button'),
    (r'/shared/landing/Button', r'/shared/components/Button'),
    (r'/shared/landing_components/Card', r'/shared/components/Card'),
    (r'/shared/landing/Card', r'/shared/components/Card'),
]

files_changed = 0

for root, _, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = content
            for old, new in RELATIVE_REPLACEMENTS:
                new_content = new_content.replace(old, new)
                
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                files_changed += 1
                print(f"Updated: {filepath}")

print(f"Total files updated: {files_changed}")
