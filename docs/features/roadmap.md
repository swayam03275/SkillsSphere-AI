# Interactive Learning Roadmap Module

Personalized skill-trees generated from AI resume analysis. Students track progress through milestones, tutors assign resources and verify completion, and recruiters can monitor candidate growth.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                             │
│  RoadmapPage (student) → milestone timeline + collaboration      │
│  TutorRoadmapLobby (tutor) → student list + resource assignment  │
│  RoadmapCollaborationPanel → real-time comments via Socket.IO    │
│  roadmapService.js (API client)                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼───────────────────────────────────────┐
│                      Node.js Backend                              │
│  routes.js → controller.js (12 endpoints)                        │
│  socket.js → real-time comment streaming                         │
│  Models: LearningProgress, RoadmapComment                         │
│  Integration: notifications service, Socket.IO                    │
└──────────────────────────────────────────────────────────────────┘
```

## Roadmap Flow

1. **Resume analysis completes** → `syncRoadmap()` called with target role + topics
2. **Roadmap created** → `LearningProgress` document with topic milestones
3. **Student views roadmap** → Vertical timeline with progress ring
4. **Student marks topics complete** → `PATCH /api/roadmap/update-topic`
5. **Tutor assigns resources** → Videos, articles, documentation per topic
6. **Tutor verifies completion** → Auto-marks as completed, boosts readiness score
7. **Real-time collaboration** → Comments and status changes via Socket.IO

## Roadmap Sync Logic

When `syncRoadmap(targetRole, topics[])` is called:

- **Existing roadmap**: Merges new topics while preserving completed state
- **New roadmap**: Creates fresh `LearningProgress` with all topics as `not_started`
- **Max 50 topics** per roadmap

## Tutor Capabilities

| Action                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| --------              | -------------                                            |
| View student roadmaps | List all students tracking by this tutor                 |
| Assign resources      | Add video/article/documentation links to specific topics |
| Verify completion     | Toggle `isVerified` flag (auto-marks as completed)       |
| Add custom milestones | Insert tutor-defined topics into student roadmap         |
| Discuss               | Real-time comment on any milestone                       |

## Student Capabilities

| Action          | Description                                               |
| --------------- | --------------------------------------------------------- |
| --------        | -------------                                             |
| View roadmap    | Vertical timeline with progress ring                      |
| Mark complete   | Toggle topic status between `in_progress` and `completed` |
| Discuss         | Real-time comment on any milestone                        |
| Opt-in tracking | Allow recruiters/tutors to view their roadmap             |

## Database Models

### LearningProgress

| Field                | Type       | Notes                      |
| -------------------- | ---------- | -------------------------- |
| -------              | ------     | -------                    |
| `user`               | ObjectId   | Ref: User, unique (1:1)    |
| `targetRole`         | String     | e.g., "frontend-developer" |
| `roadmap`            | Array      | Topic progress objects     |
| `overallProgress`    | Number     | Auto-calculated 0-100      |
| `recruitersTracking` | [ObjectId] | Recruiters with access     |
| `tutorsTracking`     | [ObjectId] | Tutors with access         |

#### Topic Progress Schema

| Field          | Type     | Notes                                       |
| -------------- | -------- | ------------------------------------------- |
| -------        | ------   | -------                                     |
| `topicName`    | String   | Required                                    |
| `type`         | String   | `learning` or `contribution`                |
| `status`       | String   | `not_started` / `in_progress` / `completed` |
| `isVerified`   | Boolean  | Tutor-verified flag                         |
| `verifiedBy`   | ObjectId | Tutor who verified                          |
| `resources`    | Array    | `{ title, url, type, tutorAssigned }`       |
| `addedByTutor` | Boolean  | Custom milestone flag                       |

**Virtual fields:**
- `readinessBoost` — Each completed contribution topic adds 5% boost
- `overallProgress` — Auto-calculated via pre-save middleware

### RoadmapComment

| Field         | Type     | Notes                                         |
| ------------- | -------- | --------------------------------------------- |
| -------       | ------   | -------                                       |
| `roadmap`     | ObjectId | Ref: LearningProgress                         |
| `milestoneId` | ObjectId | Subdocument ref                               |
| `sender`      | ObjectId | Ref: User                                     |
| `content`     | String   | Comment text                                  |
| `type`        | String   | `comment` / `status_change` / `task_assigned` |

## Real-Time Collaboration

### Socket.IO Events

**Client → Server:**

| Event            | Data                                   | Description        |
| ---------------- | -------------------------------------- | ------------------ |
| -------          | ------                                 | -------------      |
| `join-roadmap`   | `{ roadmapId }`                        | Join roadmap room  |
| `leave-roadmap`  | `{ roadmapId }`                        | Leave roadmap room |
| `roadmap-typing` | `{ roadmapId, milestoneId, isTyping }` | Typing indicator   |

**Server → Client:**

| Event                   | Description             |
| ----------------------- | ----------------------- |
| -------                 | -------------           |
| `roadmap-room-joined`   | Confirmed room join     |
| `new-roadmap-comment`   | New comment broadcast   |
| `roadmap-typing-update` | Typing indicator update |
| `roadmap-error`         | Error message           |

### Cross-Role Notifications

- Student comments → Notify tracking tutors
- Tutor comments → Notify student
- Status changes → System comment created + notification sent
- Resource assignments → Notification to student with task_assigned comment

## API Endpoints

| Method   | Endpoint                                     | Auth      | Description                       |
| -------- | -------------------------------------------- | --------- | --------------------------------- |
| -------- | ----------                                   | ------    | -------------                     |
| `GET`    | `/api/roadmap/me`                            | any       | Get own roadmap                   |
| `POST`   | `/api/roadmap/sync`                          | any       | Sync roadmap from resume analysis |
| `PATCH`  | `/api/roadmap/update-topic`                  | any       | Update topic status               |
| `GET`    | `/api/roadmap/tutor/students`                | tutor     | List tracked students             |
| `GET`    | `/api/roadmap/tutor/students/:studentId`     | tutor     | Get student roadmap               |
| `POST`   | `/api/roadmap/tutor/assign-resource`         | tutor     | Assign resource to topic          |
| `POST`   | `/api/roadmap/tutor/verify-topic`            | tutor     | Verify topic completion           |
| `POST`   | `/api/roadmap/tutor/add-milestone`           | tutor     | Add custom milestone              |
| `POST`   | `/api/roadmap/student/opt-in-tracking`       | student   | Allow recruiter tracking          |
| `POST`   | `/api/roadmap/student/opt-in-tutor-tracking` | student   | Allow tutor tracking              |
| `GET`    | `/api/roadmap/recruiter/tracked`             | recruiter | View tracked roadmaps             |
| `GET`    | `/api/roadmap/:id/comments`                  | any       | Get milestone comments            |
| `POST`   | `/api/roadmap/:id/comments`                  | any       | Post comment                      |

## Frontend Routes

| Route            | Page              | Description                   |
| ---------------- | ----------------- | ----------------------------- |
| -------          | ------            | -------------                 |
| `/roadmap`       | RoadmapPage       | Student roadmap visualization |
| `/tutor/roadmap` | TutorRoadmapLobby | Tutor student management      |

## Key Components

| Component                   | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| -----------                 | ---------                                                    |
| `RoadmapPage`               | Vertical timeline with milestone cards, progress ring        |
| `TutorRoadmapLobby`         | Two-panel: student list + roadmap detail with resource forms |
| `ContributionSummaryCard`   | Shows contribution topic completion and readiness boost      |
| `RoadmapCollaborationPanel` | Slide-in panel for real-time milestone discussion            |

## Key Files

```text
client/src/modules/roadmap/
├── pages/
│   ├── RoadmapPage.jsx                    # Student roadmap view
│   └── TutorRoadmapLobby.jsx             # Tutor management dashboard
├── components/
│   ├── ContributionSummaryCard.jsx        # Contribution stats
│   └── RoadmapCollaborationPanel.jsx      # Real-time comments
└── services/roadmapService.js             # API client (12 functions)

server/src/modules/roadmap/
├── routes.js                              # 13 endpoints
├── controller.js                          # 12 handlers with business logic
└── socket.js                              # Real-time comment streaming
```

## Integration Points

- **Resume Analyzer**: Triggers `syncRoadmap()` after analysis with skill gaps → topics
- **Dashboard**: Roadmap progress feeds into skill tracking metrics
- **Recruiter Talent Finder**: Roadmap data visible to opted-in recruiters
- **Notifications**: Status changes and resource assignments trigger notifications
- **Analytics**: Roadmap completion rates used in tutor analytics
