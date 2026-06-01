import os
import re

HOOK_PATH_BASE = "client/src/hooks/useDocumentTitle"
ROOT_DIR = "/Users/arshverma/GitHub/SkillsSphere-AI/client/src"

def get_relative_import_path(file_path):
    # Calculate relative path from file_path to hooks/useDocumentTitle
    dir_path = os.path.dirname(file_path)
    # ROOT_DIR is client/src
    # hook is at client/src/hooks/useDocumentTitle.js
    rel = os.path.relpath(os.path.join(ROOT_DIR, "hooks/useDocumentTitle"), dir_path)
    if not rel.startswith('.'):
        rel = './' + rel
    return rel

def process_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    if 'useDocumentTitle' in content:
        return # Already injected

    # Heuristic to find the main component
    # It usually starts with `const ComponentName = ` or `export default function ComponentName`
    # or `export function ComponentName`
    
    # Let's find the component name from the filename
    basename = os.path.basename(file_path)
    comp_name = basename.replace('.jsx', '')

    # Regex to find component declaration
    # e.g., const CompName = () => {
    # e.g., export default function CompName() {
    # e.g., function CompName() {
    
    pattern1 = re.compile(r'(const\s+' + comp_name + r'\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{)')
    pattern2 = re.compile(r'((?:export\s+default\s+)?function\s+' + comp_name + r'\s*\([^)]*\)\s*\{)')
    
    match = pattern1.search(content)
    if not match:
        match = pattern2.search(content)

    if not match:
        return # Not found, maybe not a page component

    title_str = comp_name.replace('Page', '').replace('Dashboard', '').strip()
    # add spaces to camel case
    title_str = re.sub(r'([a-z])([A-Z])', r'\1 \2', title_str)
    if not title_str:
        title_str = comp_name

    injection = f'\n  useDocumentTitle("{title_str}");'
    
    new_content = content[:match.end()] + injection + content[match.end():]
    
    # Now inject the import at the top
    # Find the last import
    import_match = list(re.finditer(r'^import.*$', new_content, re.MULTILINE))
    
    rel_path = get_relative_import_path(file_path)
    import_statement = f'import {{ useDocumentTitle }} from "{rel_path}";\n'

    if import_match:
        last_import = import_match[-1]
        new_content = new_content[:last_import.end()] + '\n' + import_statement + new_content[last_import.end():]
    else:
        new_content = import_statement + new_content

    with open(file_path, 'w') as f:
        f.write(new_content)
    print(f"Injected into {file_path}")

for root, dirs, files in os.walk(os.path.join(ROOT_DIR, "modules")):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
            
# Also do landing page
process_file(os.path.join(ROOT_DIR, "modules/landing/LandingPage.jsx"))
