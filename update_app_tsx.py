import re

with open('client/src/app/App.tsx', 'r') as f:
    content = f.read()

# Add ErrorBoundary to major module routes
routes_to_wrap = [
    'JobMatcherPage',
    'MyApplicationsPage',
    'ResumeAnalyzerPage',
    'ResumeAnalyzerHistoryPage',
    'DashboardPage',
    'NotificationsPage',
    'ProfilePage',
    'ClassroomsDashboard',
    'ClassroomRoom',
    'InterviewSession',
    'InterviewLobby',
    'RecruiterJobsPage',
    'TalentFinderPage'
]

for route in routes_to_wrap:
    content = re.sub(
        f'<({route}) />',
        f'<ErrorBoundary><\\1 /></ErrorBoundary>',
        content
    )

with open('client/src/app/App.tsx', 'w') as f:
    f.write(content)

print("Updated App.tsx")
