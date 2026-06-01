import os
import re

ROOT_DIR = "/Users/arshverma/GitHub/SkillsSphere-AI/client/src"

for root, dirs, files in os.walk(ROOT_DIR):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Find lines like:
            # import { \s* \n import { useDocumentTitle }
            
            lines = content.split('\n')
            changed = False
            for i in range(1, len(lines)):
                if 'import { useDocumentTitle }' in lines[i] and re.match(r'^import\s*\{\s*$', lines[i-1]):
                    # swap
                    lines[i], lines[i-1] = lines[i-1], lines[i]
                    changed = True
            
            if changed:
                new_content = '\n'.join(lines)
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Fixed {path}")
