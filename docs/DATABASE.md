# Database

MongoDB accessed through Mongoose. Collections marked *planned* are designed but not yet
implemented — they arrive with their module.

## ER diagram

```mermaid
erDiagram
    USER ||--o{ TOKEN : "issues"
    USER }o--o{ USER : "follows"
    USER }o--o{ COMMUNITY : "member of"
    USER ||--o{ POST : "authors"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ MESSAGE : "sends"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ FRIEND_REQUEST : "sends"
    USER ||--o{ EVENT : "hosts"
    COMMUNITY ||--o{ POST : "contains"
    COMMUNITY ||--o{ EVENT : "schedules"
    POST ||--o{ COMMENT : "has"
    COMMENT ||--o{ COMMENT : "replies to"
    USER ||--o{ REPORT : "files"

    USER {
        ObjectId _id
        string name
        string username UK
        string email UK
        string password
        string role
        string bio
        string[] skills
        string[] interests
        string profileVisibility
        object avatar
        object coverImage
        object socials
        object location
        ObjectId[] followers FK
        ObjectId[] following FK
        ObjectId[] communities FK
        bool isEmailVerified
        bool isActive
        bool isBanned
        date passwordChangedAt
        date createdAt
    }

    TOKEN {
        ObjectId _id
        ObjectId user FK
        string tokenHash
        string type
        date expiresAt
        date usedAt
        date revokedAt
        string replacedByHash
        string userAgent
        string ipAddress
    }
```

## `users` — implemented

Profile plus credentials in one document. Profile data is read on nearly every request, so
keeping it embedded avoids a join on the hot path.

| Field                    | Type       | Notes                                              |
| ------------------------ | ---------- | -------------------------------------------------- |
| `name`                   | String     | Required, ≤ 80 chars                               |
| `username`               | String     | Required, unique, lowercase, `^[a-z0-9_]+$`        |
| `email`                  | String     | Required, unique, lowercase                        |
| `password`               | String     | bcrypt hash, cost 12, `select: false`              |
| `role`                   | Enum       | `user` \| `moderator` \| `admin`, default `user`   |
| `profileVisibility`      | Enum       | `public` \| `private`, default `public`            |
| `avatar`, `coverImage`   | Subdoc     | `{ url, publicId }` — `url` is a validated http(s) image URL today; `publicId` is reserved for Cloudinary |
| `bio`                    | String     | ≤ 500 chars                                        |
| `skills`, `interests`    | [String]   | Lowercased, unique, capped at 20                   |
| `education`              | [Subdoc]   | School, degree, field, years (1800–2100)           |
| `experience`             | [Subdoc]   | Company, title, dates, description; `isCurrent` clears `endDate` |
| `projects`               | [Subdoc]   | Title, description, http(s) url, technologies      |
| `socials`                | Subdoc     | `github`, `linkedin`, `website`                    |
| `location`               | Subdoc     | `city`, `country`                                  |
| `followers`, `following` | [ObjectId] | Self-references                                    |
| `communities`            | [ObjectId] | Ref `Community`                                    |
| `isEmailVerified`        | Boolean    | Gates verified-only features                       |
| `isActive`, `isBanned`   | Boolean    | Deactivation and moderation                        |
| `passwordChangedAt`      | Date       | Invalidates older access tokens                    |
| `lastLoginAt`            | Date       | Set on every successful sign-in                    |

**Indexes**

| Index                                | Purpose                                  |
| ------------------------------------ | ---------------------------------------- |
| `{ email: 1 }` unique                | Login lookup, duplicate prevention       |
| `{ username: 1 }` unique             | Profile URLs, duplicate prevention       |
| `{ role: 1 }`                        | Admin filtering                          |
| `{ skills: 1 }`, `{ interests: 1 }`  | Multikey, used by matching and discovery |
| `{ name, username, bio }` text       | Keyword search before semantic search    |
| `{ occupation: 1 }`                  | Discovery by role                        |
| `{ profileVisibility: 1, username: 1 }` | Public directory lookups              |

Usernames in `RESERVED_USERNAMES` (`me`, `admin`, `settings`, …) are rejected at both
registration and rename so they cannot collide with `/users/me/*` routes.

The profile API never returns `password`. Public views also omit `email` and `role`.
Owner views add `completeness` and `embeddingSource` (bio + skills + interests +
occupation + education + experience + projects, joined) so the AI service can embed
without re-deriving field lists.

## `tokens` — implemented

One collection for all three single-use or revocable token types, distinguished by `type`:
`refresh`, `email_verification`, `password_reset`.

| Field             | Type     | Notes                                             |
| ----------------- | -------- | ------------------------------------------------- |
| `user`            | ObjectId | Ref `User`, indexed                               |
| `tokenHash`       | String   | SHA-256 of the raw token; the raw value is never stored |
| `type`            | Enum     | Token purpose                                     |
| `expiresAt`       | Date     | TTL index removes the document automatically      |
| `usedAt`          | Date     | Set when consumed or rotated                      |
| `revokedAt`       | Date     | Set on logout, reset, or reuse detection          |
| `replacedByHash`  | String   | Rotation chain; its presence marks a reused token |
| `userAgent`, `ipAddress` | String | Session context for the future sessions UI |

**Indexes**

| Index                                             | Purpose                        |
| ------------------------------------------------- | ------------------------------ |
| `{ tokenHash: 1 }`                                | Verification lookup            |
| `{ user: 1, type: 1 }`                            | Revoke all sessions of a user  |
| `{ expiresAt: 1 }` with `expireAfterSeconds: 0`   | Automatic cleanup              |

## Planned collections

| Collection        | Module | Key fields                                                                  |
| ----------------- | ------ | --------------------------------------------------------------------------- |
| `communities`     | 5      | `name`, `slug` (unique), `description`, `banner`, `owner`, `moderators[]`, `members[]`, `tags[]`, `visibility` |
| `posts`           | 6      | `author`, `community`, `type` (text/image/video/poll), `content`, `media[]`, `poll`, `likes[]`, `savedBy[]`, `commentCount`, `sentiment` |
| `comments`        | 6      | `post`, `author`, `parent` (self-ref for replies), `content`, `likes[]`, `toxicityScore` |
| `messages`        | 8      | `conversation`, `sender`, `body`, `attachments[]`, `readBy[]`, `deliveredAt` |
| `conversations`   | 8      | `participants[]`, `isGroup`, `name`, `lastMessage`, `admins[]`               |
| `notifications`   | 7      | `recipient`, `actor`, `type`, `entity`, `entityModel`, `isRead`              |
| `friendRequests`  | 4      | `from`, `to`, `status`, compound unique `{ from, to }`                       |
| `events`          | 9      | `host`, `community`, `title`, `startsAt`, `location`, `poster`, `attendees[]`, `rsvps[]` |
| `reports`         | 14     | `reporter`, `targetType`, `target`, `reason`, `status`, `resolvedBy`         |
| `adminLogs`       | 14     | `admin`, `action`, `targetType`, `target`, `metadata`, `createdAt`           |
| `userEmbeddings`  | 10     | `user`, `vector` (float[384]), `model`, `sourceHash`, `updatedAt`            |

## Conventions

- Every schema uses `timestamps: true`.
- References are always `ObjectId` with an explicit `ref`, never denormalized strings.
- Arrays that can grow without bound (post likes at scale, community members) move to
  their own collection when a module needs pagination over them.
- `autoIndex` is enabled outside production; production builds indexes through a migration
  so a deploy cannot be slowed down by an index build.
