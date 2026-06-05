# Secure Environment Configuration

This project must treat API keys, service credentials, database URLs, Redis
connection details, and Cloudinary secrets as sensitive values.

## Environment file rules

- Keep real secrets in local `.env` files only.
- Commit `.env.example` with placeholder values only.
- Never commit `.env`, `.env.local`, `.env.production`, or other real
  environment files.
- Load sensitive values through `process.env` in application code.
- Avoid hardcoded credentials in source, tests, scripts, docs, or issue content.

## Installing the pre-commit protection

Run this once after cloning the repository:

```bash
npm run install:git-hooks
```

The installed pre-commit hook blocks commits that include real `.env` files.
Example files such as `.env.example` remain allowed.

## Cloudinary setup

Set these values in your local `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

The Cloudinary config must read these values from environment variables only.
If any Cloudinary credential has been committed or shared publicly, rotate it in
the Cloudinary dashboard immediately.

## Redis setup

Set Redis connection values in your local `.env` file:

```env
REDIS_URL=redis://localhost:6379
```

If your deployment requires username, password, TLS, or a managed Redis URL,
store the complete secret URL in the deployment secret manager. Do not hardcode
it in `server/src/config/redis.js`.

## Credential rotation process

1. Revoke or rotate the exposed credential in the provider dashboard.
2. Update local `.env` files and deployment secret managers with the new value.
3. Restart affected services so the new secret is loaded.
4. Search the repository history and current tree for the exposed value.
5. Notify maintainers if the secret may have been used by an unauthorized party.

## Strict Validation & Rate Limiting

- **Classrooms/Sockets**: All WebRTC and socket connections require strict authentication token validation to prevent unauthorized entry.
- **OAuth & Redirects**: All OAuth states are strictly validated. Open redirects are actively blocked.
- **Webhooks**: A strict webhook signing framework is required to verify incoming payloads.
- **Rate Limits**: Complex GraphQL or API queries are gated behind API Query Complexity rate limiters.

## Review checklist

- `.env.example` contains placeholders only.
- `.gitignore` blocks real environment files.
- `server/src/config/cloudinary.js` reads credentials from `process.env`.
- `server/src/config/redis.js` reads credentials from `process.env`.
- No API keys, tokens, passwords, or service secrets are hardcoded.
