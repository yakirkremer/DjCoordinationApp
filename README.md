# DjCoordinationApp

DJ coordination platform for wedding and event clients — preferences wizard, music catalog with ratings, and digital contract signing.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

- **App:** http://localhost:5173
- **Admin:** http://localhost:5173/admin
- **Client:** create a client in admin, then log in with the code on the welcome page

## Production

```bash
npm run build
npm start
```

Deploys to [Render](https://render.com) via `render.yaml` with a persistent disk at `/var/data`.

## Documentation

Full technical and development guide:

**[docs/PROJECT.md](docs/PROJECT.md)**

Covers architecture, API reference, contracts, storage, environment variables, deployment, and common development tasks.

## Stack

React 19 · Vite · Tailwind · Node.js · JSON file storage · PDF.js / pdf-lib
