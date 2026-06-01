# Notifications API Reference

Last Updated: May 31, 2026

## Table of Contents

- [Overview](#overview)
- [Implementation Sources](#implementation-sources)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Data Model](#data-model)
- [Endpoint Summary](#endpoint-summary)
- [Common Response Shapes](#common-response-shapes)
- [Endpoints](#endpoints)
  - [List Notifications](#list-notifications)
  - [Get Unread Count](#get-unread-count)
  - [Create Notification](#create-notification)
  - [Mark All Notifications as Read](#mark-all-notifications-as-read)
  - [Get Notification by ID](#get-notification-by-id)
  - [Mark Notification as Read](#mark-notification-as-read)
  - [Delete Notification](#delete-notification)
  - [Delete All Notifications](#delete-all-notifications)
- [Error Codes](#error-codes)
- [WebSocket Events](#websocket-events)
- [Pagination, Filtering, and Sorting](#pagination-filtering-and-sorting)
- [Developer Notes](#developer-notes)
- [Last Updated](#last-updated)

## Overview

The Notifications API lets an authenticated user list, create, read, and delete notification records. All REST routes are mounted under:

```text
/api/notifications
```

The backend implementation is private by default: `server/src/modules/notifications/routes.js` applies `protect` to every notification route. Users may only access, update, or delete their own notifications.

## Implementation Sources

This document is based on the current code in:

- `server/src/modules/notifications/routes.js`
- `server/src/modules/notifications/controller.js`
- `server/src/modules/notifications/service.js`
- `server/src/modules/notifications/socket.js`
- `server/src/database/models/Notification.js`
- `server/src/middleware/authMiddleware.js`
- `server/src/middleware/rateLimiter.js`
- `server/index.js`
- `client/src/services/notificationService.js`

## Authentication

### REST Authentication

All notification REST endpoints require a valid JWT bearer token.

Required header:

```http
Authorization: Bearer <JWT>
```

Example authenticated request:

```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json"
```

If the token is missing, invalid, revoked, expired, or belongs to a deleted user, the request fails with `401 Unauthorized`.

Example authorization failure:

```json
{
  "success": false,
  "status": "fail",
  "message": "Invalid token. Please log in again.",
  "errors": {}
}
```

### WebSocket Authentication

Socket.io connections must pass a JWT in the handshake auth object:

```javascript
const socket = io("http://localhost:5000", {
  auth: {
    token: jwtToken,
  },
});
```

The server verifies the token with `verifySocketToken`, then attaches the authenticated user to `socket.user`.

## Rate Limiting

No notification-specific rate limiting is currently implemented.

Notification REST endpoints do inherit the global `/api` rate limiter from `server/index.js`:

| Scope | Default Limit | Window | Headers |
| --- | ---: | --- | --- |
| All `/api` routes, including `/api/notifications` | `300` requests | `15 minutes` | Standard `RateLimit-*` headers |

The global limit can be changed with `GLOBAL_LIMIT_MAX`.

Example exceeded-limit response:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again after 15 minutes.",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

## Data Model

Notification documents are stored with this shape:

```json
{
  "_id": "665b673d4dc0f879bb3f6f11",
  "userId": {
    "_id": "665b65d64dc0f879bb3f6ef1",
    "name": "Aarav Mehta",
    "email": "aarav@example.com"
  },
  "title": "Interview Scheduled",
  "message": "Your interview with Acme Corp is scheduled for June 4.",
  "type": "interview",
  "isRead": false,
  "metadata": {
    "relatedId": "665b67a54dc0f879bb3f6f44",
    "relatedModel": "Interview",
    "actionUrl": "/interviews/665b67a54dc0f879bb3f6f44"
  },
  "relatedData": null,
  "createdAt": "2026-05-31T10:30:00.000Z",
  "updatedAt": "2026-05-31T10:30:00.000Z"
}
```

### Fields

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | MongoDB ObjectId. |
| `userId` | object | Populated with `_id`, `name`, and `email` in API responses. |
| `title` | string | Required. Trimmed. Minimum 2 characters, maximum 200. |
| `message` | string | Required. Trimmed. Minimum 5 characters. |
| `type` | string | Required. See accepted values below. |
| `isRead` | boolean | Defaults to `false`. |
| `metadata.relatedId` | string or null | Optional ObjectId reference. |
| `metadata.relatedModel` | string or null | One of `JobPosting`, `JobApplication`, `Interview`, `Resume`, or `null`. |
| `metadata.actionUrl` | string or null | Optional frontend navigation path. |
| `relatedData` | object or null | Flexible cross-module context. |
| `createdAt` | string | ISO timestamp. |
| `updatedAt` | string | ISO timestamp. |

### Notification Types

The REST create endpoint currently accepts:

| Type | Use Case |
| --- | --- |
| `info` | General information. |
| `warning` | Warning or attention-needed messages. |
| `success` | Successful action confirmations. |
| `error` | Error notifications. |
| `job-update` | Job posting or job-related updates. |
| `interview` | Interview scheduling and updates. |
| `application` | Application status or application-related updates. |
| `new_application` | New application notifications. |
| `skill_gap_alert` | Skill gap alerts. |

The Mongoose model also allows `application_status`, but the current REST `POST /api/notifications` controller does not accept that value.

## Endpoint Summary

| Method | Path | Purpose | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | List notifications for the authenticated user. | Yes |
| `GET` | `/api/notifications/unread-count` | Get unread notification count. | Yes |
| `POST` | `/api/notifications` | Create a notification for the authenticated user. | Yes |
| `PATCH` | `/api/notifications/mark-all/read` | Mark all authenticated user's notifications as read. | Yes |
| `GET` | `/api/notifications/:id` | Get one notification by ID. | Yes |
| `PATCH` | `/api/notifications/:id/read` | Mark one notification as read. | Yes |
| `DELETE` | `/api/notifications/:id` | Delete one notification. | Yes |
| `DELETE` | `/api/notifications` | Delete all authenticated user's notifications. | Yes |

## Common Response Shapes

### Success With Data

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Success With Pagination

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "message": "Notifications retrieved successfully"
}
```

### Error

Production error responses from `globalErrorHandler` usually use:

```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed",
  "errors": {
    "title": "Title is required"
  }
}
```

Development responses may also include `error` and `stack`.

## Endpoints

### List Notifications

```http
GET /api/notifications
```

Returns notifications for the authenticated user, sorted newest first.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Query Parameters

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | number | No | `1` | Page number. |
| `limit` | number | No | `20` on backend, `10` in current frontend service | Items per page. |
| `isRead` | boolean | No | none | Filter by read status. Use `true` for read, `false` for unread. |

#### Request Body

None.

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10&isRead=false" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "665b673d4dc0f879bb3f6f11",
      "userId": {
        "_id": "665b65d64dc0f879bb3f6ef1",
        "name": "Aarav Mehta",
        "email": "aarav@example.com"
      },
      "title": "New Job Recommendation",
      "message": "A backend role matching your profile was posted.",
      "type": "job-update",
      "isRead": false,
      "metadata": {
        "relatedId": "665b67a54dc0f879bb3f6f44",
        "relatedModel": "JobPosting",
        "actionUrl": "/jobs/665b67a54dc0f879bb3f6f44"
      },
      "relatedData": null,
      "createdAt": "2026-05-31T10:30:00.000Z",
      "updatedAt": "2026-05-31T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "message": "Notifications retrieved successfully"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "You are not logged in! Please log in to get access.",
  "errors": {}
}
```

### Get Unread Count

```http
GET /api/notifications/unread-count
```

Returns the number of unread notifications for the authenticated user.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Parameters

None.

#### Request Body

None.

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/notifications/unread-count" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  },
  "message": "Unread count retrieved successfully"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Invalid token. Please log in again.",
  "errors": {}
}
```

### Create Notification

```http
POST /api/notifications
```

Creates a notification for the authenticated user.

Important: the controller currently only allows users to create notifications for themselves. If `body.userId` does not match the authenticated user's `_id`, the API returns `403 Forbidden`.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Request Body Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | string | Yes | Must equal the authenticated user's ID. |
| `title` | string | Yes | Notification title. |
| `message` | string | Yes | Notification message. |
| `type` | string | Yes | One of the REST-accepted notification types. |
| `metadata` | object | No | Optional related resource metadata. |
| `metadata.relatedId` | string | No | Related ObjectId. |
| `metadata.relatedModel` | string | No | `JobPosting`, `JobApplication`, `Interview`, or `Resume`. |
| `metadata.actionUrl` | string | No | Frontend path for deep linking. |

#### Example Request

```bash
curl -X POST "http://localhost:5000/api/notifications" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "665b65d64dc0f879bb3f6ef1",
    "title": "Interview Scheduled",
    "message": "Your interview with Acme Corp is scheduled for June 4.",
    "type": "interview",
    "metadata": {
      "relatedId": "665b67a54dc0f879bb3f6f44",
      "relatedModel": "Interview",
      "actionUrl": "/interviews/665b67a54dc0f879bb3f6f44"
    }
  }'
```

#### Example Success Response

```json
{
  "success": true,
  "data": {
    "_id": "665b68024dc0f879bb3f6f77",
    "userId": {
      "_id": "665b65d64dc0f879bb3f6ef1",
      "name": "Aarav Mehta",
      "email": "aarav@example.com"
    },
    "title": "Interview Scheduled",
    "message": "Your interview with Acme Corp is scheduled for June 4.",
    "type": "interview",
    "isRead": false,
    "metadata": {
      "relatedId": "665b67a54dc0f879bb3f6f44",
      "relatedModel": "Interview",
      "actionUrl": "/interviews/665b67a54dc0f879bb3f6f44"
    },
    "relatedData": null,
    "createdAt": "2026-05-31T10:40:00.000Z",
    "updatedAt": "2026-05-31T10:40:00.000Z"
  },
  "message": "Notification created successfully"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed",
  "errors": {
    "userId": "User ID is required",
    "title": "Title is required",
    "message": "Message is required",
    "type": "Type is required"
  }
}
```

### Mark All Notifications as Read

```http
PATCH /api/notifications/mark-all/read
```

Marks all unread notifications for the authenticated user as read.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Parameters

None.

#### Request Body

None.

#### Example Request

```bash
curl -X PATCH "http://localhost:5000/api/notifications/mark-all/read" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Invalid token. Please log in again.",
  "errors": {}
}
```

### Get Notification by ID

```http
GET /api/notifications/:id
```

Returns one notification by ID if it belongs to the authenticated user.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Notification ObjectId. |

#### Request Body

None.

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/notifications/665b673d4dc0f879bb3f6f11" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "data": {
    "_id": "665b673d4dc0f879bb3f6f11",
    "userId": {
      "_id": "665b65d64dc0f879bb3f6ef1",
      "name": "Aarav Mehta",
      "email": "aarav@example.com"
    },
    "title": "New Job Recommendation",
    "message": "A backend role matching your profile was posted.",
    "type": "job-update",
    "isRead": false,
    "metadata": {
      "relatedId": "665b67a54dc0f879bb3f6f44",
      "relatedModel": "JobPosting",
      "actionUrl": "/jobs/665b67a54dc0f879bb3f6f44"
    },
    "relatedData": null,
    "createdAt": "2026-05-31T10:30:00.000Z",
    "updatedAt": "2026-05-31T10:30:00.000Z"
  },
  "message": "Notification retrieved successfully"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Notification not found",
  "errors": {}
}
```

### Mark Notification as Read

```http
PATCH /api/notifications/:id/read
```

Marks one notification as read if it belongs to the authenticated user.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Notification ObjectId. |

#### Request Body

None.

#### Example Request

```bash
curl -X PATCH "http://localhost:5000/api/notifications/665b673d4dc0f879bb3f6f11/read" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "data": {
    "_id": "665b673d4dc0f879bb3f6f11",
    "userId": {
      "_id": "665b65d64dc0f879bb3f6ef1",
      "name": "Aarav Mehta",
      "email": "aarav@example.com"
    },
    "title": "New Job Recommendation",
    "message": "A backend role matching your profile was posted.",
    "type": "job-update",
    "isRead": true,
    "metadata": {
      "relatedId": "665b67a54dc0f879bb3f6f44",
      "relatedModel": "JobPosting",
      "actionUrl": "/jobs/665b67a54dc0f879bb3f6f44"
    },
    "relatedData": null,
    "createdAt": "2026-05-31T10:30:00.000Z",
    "updatedAt": "2026-05-31T10:45:00.000Z"
  },
  "message": "Notification marked as read"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Not authorized to update this notification",
  "errors": {}
}
```

### Delete Notification

```http
DELETE /api/notifications/:id
```

Deletes one notification if it belongs to the authenticated user.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Notification ObjectId. |

#### Request Body

None.

#### Example Request

```bash
curl -X DELETE "http://localhost:5000/api/notifications/665b673d4dc0f879bb3f6f11" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Not authorized to delete this notification",
  "errors": {}
}
```

### Delete All Notifications

```http
DELETE /api/notifications
```

Deletes all notifications for the authenticated user.

#### Authentication

Required: `Authorization: Bearer <JWT>`

#### Parameters

None.

#### Request Body

None.

#### Example Request

```bash
curl -X DELETE "http://localhost:5000/api/notifications" \
  -H "Authorization: Bearer <JWT>"
```

#### Example Success Response

```json
{
  "success": true,
  "data": {
    "deletedCount": 4
  },
  "message": "All notifications deleted successfully"
}
```

#### Example Error Response

```json
{
  "success": false,
  "status": "fail",
  "message": "Invalid token. Please log in again.",
  "errors": {}
}
```

## Error Codes

### Client Errors 4xx

#### 400 Bad Request

Meaning: The request contains invalid input, invalid ObjectId format, or fails validation.

Common causes:

- Missing `userId`, `title`, `message`, or `type` when creating a notification.
- Unsupported `type`.
- Invalid MongoDB ObjectId in `:id`.
- Mongoose schema validation failure.

Example:

```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed",
  "errors": {
    "type": "Type must be one of: info, warning, success, error, job-update, interview, application, new_application, skill_gap_alert"
  }
}
```

#### 401 Unauthorized

Meaning: Authentication failed.

Common causes:

- Missing `Authorization` header.
- Token is invalid, expired, revoked, or malformed.
- Token references a user that no longer exists.

Example:

```json
{
  "success": false,
  "status": "fail",
  "message": "You are not logged in! Please log in to get access.",
  "errors": {}
}
```

#### 403 Forbidden

Meaning: The authenticated user is not allowed to perform the action.

Common causes:

- Creating a notification for another user.
- Reading, updating, or deleting a notification owned by another user.

Example:

```json
{
  "success": false,
  "status": "fail",
  "message": "Not authorized to access this notification",
  "errors": {}
}
```

#### 404 Not Found

Meaning: The notification does not exist.

Common causes:

- Notification ID is valid but no matching document exists.
- The notification was already deleted.

Example:

```json
{
  "success": false,
  "status": "fail",
  "message": "Notification not found",
  "errors": {}
}
```

#### 422 Validation Error

The notification module does not currently use `422 Unprocessable Entity`. Validation errors are returned as `400 Bad Request`.

#### 429 Too Many Requests

Meaning: The global `/api` rate limit was exceeded.

Common causes:

- More than the configured number of API requests were made within the rate-limit window.

Example:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again after 15 minutes.",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### Server Errors 5xx

#### 500 Internal Server Error

Meaning: An unexpected server error occurred.

Common causes:

- Database failure.
- Unexpected runtime error.
- Unhandled implementation issue.

Example:

```json
{
  "success": false,
  "status": "error",
  "message": "Something went very wrong!"
}
```

#### 502/503 Service Errors

The notification module does not currently define notification-specific `502` or `503` responses. These may still occur at the platform or infrastructure layer, or if shared middleware fails before the request reaches the notification controller.

Example:

```json
{
  "success": false,
  "status": "error",
  "message": "Service temporarily unavailable"
}
```

## WebSocket Events

Notification sockets are initialized in `server/src/modules/notifications/socket.js` after the global Socket.io JWT authentication middleware in `server/index.js`.

### Connection Requirements

- Transport: Socket.io.
- Authentication: JWT in `socket.handshake.auth.token`.
- The server derives the user's notification room from `socket.user._id`.
- Clients do not provide a user ID when joining the notification room.

Example connection:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: jwtToken,
  },
});
```

### Client Events

#### `join-notifications`

Client event used to join the authenticated user's notification room.

Payload: none.

Example:

```javascript
socket.emit("join-notifications");
```

Server behavior:

- Computes `roomName` as `user_${socket.user._id}`.
- Joins the socket to that room.
- Emits `notification-ready` back to the same socket.

No `notification:subscribe` or `notification:markRead` socket events are currently implemented. Marking notifications as read is done through the REST API.

### Server Events

#### `notification-ready`

Emitted after a socket successfully joins the authenticated user's notification room.

Payload:

```json
{
  "room": "user_665b65d64dc0f879bb3f6ef1"
}
```

Example listener:

```javascript
socket.on("notification-ready", (payload) => {
  console.log(payload.room);
});
```

No `notification:new`, `notification:read`, `notification:deleted`, or similarly named notification socket events are currently implemented in `server/src/modules/notifications/socket.js`.

### Socket Authentication Errors

If the socket token is missing or invalid, the Socket.io connection is rejected by middleware before notification events are registered.

Example client handling:

```javascript
socket.on("connect_error", (error) => {
  console.error(error.message);
});
```

### Reconnection Behavior

Socket.io automatically removes sockets from rooms on disconnect. After reconnecting, the client should emit `join-notifications` again to rejoin the authenticated notification room.

## Pagination, Filtering, and Sorting

- Pagination is supported on `GET /api/notifications`.
- Backend defaults are `page=1` and `limit=20`.
- The current frontend service sends `limit=10` by default.
- `isRead=true` returns read notifications.
- `isRead=false` returns unread notifications.
- Omitting `isRead` returns both read and unread notifications.
- Results are sorted by `createdAt` descending.
- Pagination response includes `page`, `limit`, `total`, and `pages`.

Example:

```http
GET /api/notifications?page=2&limit=10&isRead=true
```

## Developer Notes

- All notification routes are protected with `protect`.
- The REST create endpoint is authenticated but self-scoped: `userId` in the request body must match `req.user._id`.
- Ownership checks are enforced when reading, marking as read, or deleting a single notification.
- `DELETE /api/notifications` and `PATCH /api/notifications/mark-all/read` act only on the authenticated user's notifications.
- The database indexes are `{ userId: 1, createdAt: -1 }` and `{ userId: 1, isRead: 1 }`.
- The notification module currently has room-join WebSocket support only; state changes such as read/delete are exposed through REST.

## Last Updated

May 31, 2026
