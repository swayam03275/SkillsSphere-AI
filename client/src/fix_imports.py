import os

ROOT_DIR = "/Users/arshverma/GitHub/SkillsSphere-AI/client/src"

for root, dirs, files in os.walk(ROOT_DIR):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # The exact string that caused the issue:
            bad_str = 'import {\nimport { useDocumentTitle }'
            if bad_str in content:
                # We need to swap them, but be careful with the rest of the import
                # Let's just find "import {" and the useDocumentTitle import and flip them
                # A safer replace:
                # Find the line that has `import { useDocumentTitle }` and the previous line.
                lines = content.split('\n')
                for i in range(1, len(lines)):
                    if 'import { useDocumentTitle }' in lines[i] and lines[i-1].strip() == 'import {':
                        # swap
                        lines[i], lines[i-1] = lines[i-1], lines[i]
                new_content = '\n'.join(lines)
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Fixed {path}")
