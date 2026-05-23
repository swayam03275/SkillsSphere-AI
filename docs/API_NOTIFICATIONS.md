# Notifications REST API Documentation

## Overview

This document provides comprehensive guidance on the Notifications REST API system implemented for SkillsSphere-AI. The API enables users to manage notifications efficiently with full CRUD operations, filtering, and real-time capabilities.

## Architecture

### Directory Structure

```bash
server/src/modules/notifications/
├── controller.js          # HTTP request handlers
├── service.js             # Business logic layer
├── routes.js              # Express routes and middleware
├── socket.js              # WebSocket event handlers
└── __tests__/
    ├── service.test.js    # Service unit tests
    └── controller.test.js # Controller unit tests
```

### Database Model

```bash
server/src/database/models/Notification.js
```

## Database Schema

### Notification Model

```javascript
{
  userId: ObjectId,           // Reference to User
  title: String,              // Notification title (required)
  message: String,            // Notification message (required)
  type: String,               // Type: info|warning|success|error|job-update|interview|application
  isRead: Boolean,            // Read status (default: false)
  metadata: {
    relatedId: ObjectId,      // Reference to related document
    relatedModel: String,     // Related model: JobPosting|JobApplication|Interview|Resume
    actionUrl: String,        // Frontend navigation URL
  },
  createdAt: Date,            // Auto-generated timestamp
  updatedAt: Date,            // Auto-generated timestamp
}
```

### Indexes for Performance

- `{ userId: 1, createdAt: -1 }` - Fast retrieval of notifications by user, sorted by creation date
- `{ userId: 1, isRead: 1 }` - Efficient filtering by read status

## API Endpoints

### 1. Get All Notifications

**Endpoint:** `GET /api/notifications`

**Authentication:** Required (Bearer Token)

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `isRead` (boolean, optional): Filter by read status

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "notif-1",
      "userId": {
        "_id": "user-1",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "title": "New Job Recommendation",
      "message": "A job matching your profile has been posted",
      "type": "job-update",
      "isRead": false,
      "metadata": {
        "relatedId": "job-123",
        "relatedModel": "JobPosting",
        "actionUrl": "/jobs/job-123"
      },
      "createdAt": "2026-05-23T10:30:00Z",
      "updatedAt": "2026-05-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "message": "Notifications retrieved successfully"
}
```

### 2. Get Unread Notification Count

**Endpoint:** `GET /api/notifications/unread-count`

**Authentication:** Required (Bearer Token)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  },
  "message": "Unread count retrieved successfully"
}
```

### 3. Create Notification

**Endpoint:** `POST /api/notifications`

**Authentication:** Required (Bearer Token)

**Request Body:**

```json
{
  "userId": "user-2",
  "title": "Interview Scheduled",
  "message": "Your interview with Acme Corp is scheduled for May 25",
  "type": "interview",
  "metadata": {
    "relatedId": "interview-456",
    "relatedModel": "Interview",
    "actionUrl": "/interviews/interview-456"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "_id": "notif-2",
    "userId": {
      "_id": "user-2",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "title": "Interview Scheduled",
    "message": "Your interview with Acme Corp is scheduled for May 25",
    "type": "interview",
    "isRead": false,
    "metadata": {
      "relatedId": "interview-456",
      "relatedModel": "Interview",
      "actionUrl": "/interviews/interview-456"
    },
    "createdAt": "2026-05-23T11:00:00Z",
    "updatedAt": "2026-05-23T11:00:00Z"
  },
  "message": "Notification created successfully"
}
```

**Validation Errors (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "userId": "User ID is required",
    "type": "Type must be one of: info, warning, success, error, job-update, interview, application"
  }
}
```

### 4. Get Single Notification

**Endpoint:** `GET /api/notifications/:id`

**Authentication:** Required (Bearer Token)

**Path Parameters:**

- `id` (string, required): Notification ID

**Response (200 OK):** Same as notification object in list endpoint

**Error Responses:**

- 404 Not Found: Notification not found
- 403 Forbidden: Not authorized to access this notification

### 5. Mark Notification as Read

**Endpoint:** `PATCH /api/notifications/:id/read`

**Authentication:** Required (Bearer Token)

**Path Parameters:**

- `id` (string, required): Notification ID

**Request Body:** Empty

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "notif-1",
    "isRead": true,
    ...
  },
  "message": "Notification marked as read"
}
```

### 6. Mark All Notifications as Read

**Endpoint:** `PATCH /api/notifications/mark-all/read`

**Authentication:** Required (Bearer Token)

**Request Body:** Empty

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 7. Delete Notification

**Endpoint:** `DELETE /api/notifications/:id`

**Authentication:** Required (Bearer Token)

**Path Parameters:**

- `id` (string, required): Notification ID

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### 8. Delete All Notifications

**Endpoint:** `DELETE /api/notifications`

**Authentication:** Required (Bearer Token)

**Request Body:** Empty

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "deletedCount": 10
  },
  "message": "All notifications deleted successfully"
}
```

## Notification Types

| Type          | Use Case                           |
| ------------- | ---------------------------------- |
| `info`        | General informational messages     |
| `warning`     | Warning or alert messages          |
| `success`     | Success confirmations              |
| `error`       | Error notifications                |
| `job-update`  | Job posting or job-related updates |
| `interview`   | Interview scheduling and updates   |
| `application` | Job application status changes     |

## Real-Time Notifications via WebSocket

### Socket Events

#### Join Notification Room (Client → Server)

```javascript
socket.emit("join-notifications");
```

#### Notification Ready (Server → Client)

```javascript
socket.on("notification-ready", (data) => {
  console.log(data.room); // e.g., "user_user-1"
});
```

### Broadcasting Notifications to Users

```javascript
io.to(`user_${userId}`).emit("new-notification", notificationData);
```

## Testing the API

### Prerequisites

1. MongoDB running and accessible
2. Backend server running on port 5000
3. Valid JWT token from authentication

### Postman Testing Guide

#### 1. Get All Notifications

```bash
GET http://localhost:5000/api/notifications?page=1&limit=20
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: application/json
```

#### 2. Create a Notification

```bash
POST http://localhost:5000/api/notifications
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: application/json

Body:
{
  "userId": "user-id-here",
  "title": "Test Notification",
  "message": "This is a test notification message",
  "type": "info",
  "metadata": {
    "actionUrl": "/test"
  }
}
```

#### 3. Get Unread Count

```bash
GET http://localhost:5000/api/notifications/unread-count
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
```

#### 4. Mark as Read

```bash
PATCH http://localhost:5000/api/notifications/notif-id/read
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
```

#### 5. Mark All as Read

```bash
PATCH http://localhost:5000/api/notifications/mark-all/read
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
```

#### 6. Delete Notification

```bash
DELETE http://localhost:5000/api/notifications/notif-id
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
```

#### 7. Delete All Notifications

```bash
DELETE http://localhost:5000/api/notifications
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
```

## Running Unit Tests

### Run All Tests

```bash
npm test
```

### Run Notification Tests Only

```bash
npm test -- server/src/modules/notifications/__tests__/service.test.js
npm test -- server/src/modules/notifications/__tests__/controller.test.js
```

### Test Coverage

**Service Layer Tests:**

- Create notification with valid data
- Create notification with metadata
- Retrieve paginated notifications
- Filter notifications by read status
- Handle pagination correctly
- Retrieve single notification by ID
- 404 error for missing notification
- 403 error for unauthorized access
- Mark notification as read
- Mark all notifications as read
- Delete notification
- Delete all notifications
- Get unread notification count

**Controller Layer Tests:**

- Fetch all notifications
- Get unread count
- Create notification with validation
- Get single notification
- Mark as read
- Mark all as read
- Delete notification
- Delete all notifications

## Error Handling

### Common Error Codes

| Code | Message                | Resolution                          |
| ---- | ---------------------- | ----------------------------------- |
| 400  | Validation failed      | Check request body fields and types |
| 401  | Unauthorized           | Provide valid JWT token             |
| 403  | Not authorized         | User doesn't own the notification   |
| 404  | Notification not found | Check notification ID exists        |
| 500  | Server error           | Check server logs                   |

## Authorization & Security

- All endpoints require valid JWT bearer token
- Users can only access/modify their own notifications
- Invalid or expired tokens result in 401 error
- Cross-user access attempts result in 403 error
- All requests are logged for audit purposes

## Performance Considerations

1. **Pagination:** Default 20 items per page to reduce payload
2. **Indexes:** Composite indexes optimize queries by userId and time
3. **Population:** User details populated from reference for context
4. **Sorting:** Notifications sorted by creation date (newest first)
5. **Filtering:** Optional isRead filter prevents full table scans

## Future Enhancements

1. Notification templates for common message types
2. Notification scheduling and delayed delivery
3. Notification preferences and opt-out settings
4. Email digest notifications
5. Push notification support
6. Notification categorization and tags
7. Batch notification creation
8. Notification analytics and tracking

## Troubleshooting

### Issue: 401 Unauthorized

- **Cause:** Missing or invalid JWT token
- **Solution:** Ensure token is fresh and properly formatted in header

### Issue: 403 Forbidden

- **Cause:** User attempting to access another user's notification
- **Solution:** This is a security measure; users can only access their own data

### Issue: 404 Not Found

- **Cause:** Notification ID doesn't exist
- **Solution:** Verify notification ID and that it hasn't been deleted

### Issue: Empty notification list

- **Cause:** No notifications created yet or all are old
- **Solution:** Create test notifications or adjust pagination limits

## Code Examples

### JavaScript/Node.js

```javascript
const token = "your-jwt-token";
const userId = "user-id";

// Get all notifications
const response = await fetch("http://localhost:5000/api/notifications", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
const notifications = await response.json();

// Create notification
const newNotif = await fetch("http://localhost:5000/api/notifications", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    userId: userId,
    title: "Welcome",
    message: "Welcome to SkillsSphere",
    type: "info",
  }),
});
```

### cURL

```bash
# Get notifications
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notifications

# Create notification
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","title":"Test","message":"Test message","type":"info"}' \
  http://localhost:5000/api/notifications
```

## Summary

The Notifications REST API provides a robust, scalable solution for managing user notifications with:

- ✅ Full CRUD operations
- ✅ Efficient pagination and filtering
- ✅ Real-time WebSocket support
- ✅ Comprehensive error handling
- ✅ Security and authorization
- ✅ Unit tested service and controller layers
- ✅ MongoDB persistence
- ✅ Modular architecture

All endpoints follow the project's existing patterns and are ready for production use.
