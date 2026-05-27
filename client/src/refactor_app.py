import os
import re

APP_JSX = "/Users/arshverma/GitHub/SkillsSphere-AI/client/src/app/App.jsx"

with open(APP_JSX, "r") as f:
    content = f.read()

# Replace React import
content = content.replace('import React, { useEffect } from "react";', 'import React, { useEffect, Suspense, lazy } from "react";')

# Import LoadingState
content = content.replace('import SocketNotificationListener from "../shared/components/SocketNotificationListener";', 'import SocketNotificationListener from "../shared/components/SocketNotificationListener";\nimport { LoadingState } from "../shared/components";')

# Replace static imports with lazy
def replacer(match):
    component = match.group(1)
    path = match.group(2)
    
    # Don't lazy load ChatWidget, ProtectedRoute, SocketNotificationListener, or authSlice
    if component in ['ChatWidget', 'ProtectedRoute', 'SocketNotificationListener', '{ fetchCurrentUser, logoutUser }']:
        return match.group(0)
        
    return f'const {component} = lazy(() => import("{path}"));'

content = re.sub(r'^import\s+([A-Za-z0-9_]+)\s+from\s+"([^"]+)";', replacer, content, flags=re.MULTILINE)

# Wrap <Routes> with <Suspense fallback={<LoadingState message="Loading module..." />}>
content = content.replace('<Routes>', '<Suspense fallback={<LoadingState message="Loading module..." />}>\n      <Routes>')
content = content.replace('</Routes>', '</Routes>\n      </Suspense>')

with open(APP_JSX, "w") as f:
    f.write(content)

print("Refactored App.jsx successfully!")
