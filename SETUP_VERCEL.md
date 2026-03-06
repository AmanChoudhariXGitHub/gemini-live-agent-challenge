# Vercel Deployment Setup for LivePair

## Quick Start

LivePair has two separate deployments:
1. **Backend**: Cloud Run (Node.js WebSocket server)
2. **Frontend**: Vercel (React/Vite SPA)

## Frontend Deployment (Vercel)

### Step 1: Set Environment Variables

In Vercel dashboard, go to Settings → Environment Variables and add:

```
VITE_BACKEND_URL = https://livepair-backend-xxx.run.app
```

Replace `livepair-backend-xxx.run.app` with your actual Cloud Run backend URL.

### Step 2: Deploy

Push to GitHub and Vercel will automatically detect and deploy the frontend.

The `vercel.json` configuration handles:
- Building the Vite frontend in `frontend/` directory
- SPA routing (all routes serve `index.html`)
- Proper cache headers for production

### Step 3: Verify

After deployment, visit your Vercel URL. You should see:
- Dark VS Code-themed interface
- Audio capture controls
- Code editor
- Transcript display

## Backend Deployment (Cloud Run)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete Cloud Run setup instructions.

## Frontend URLs

- **Development**: http://localhost:3000
- **Production**: https://your-vercel-domain.vercel.app
- **Backend WebSocket**: wss://livepair-backend-xxx.run.app

## Troubleshooting

### 404 Error on Vercel

If you see a 404 page, check:
1. `vercel.json` exists in project root
2. Frontend build completed (check Vercel logs)
3. Environment variables are set correctly

Vercel logs location: Dashboard → Deployments → Select deployment → Logs

### Frontend Can't Connect to Backend

1. Check `VITE_BACKEND_URL` environment variable in Vercel
2. Verify backend is running and accessible
3. Check browser console for WebSocket connection errors
4. Ensure Cloud Run backend allows CORS (check `server.ts`)

### Build Failures

Frontend build relies on:
- Node.js 18+ (Vercel default)
- `frontend/` directory exists
- `package.json` in `frontend/` with build script

Check the build logs in Vercel dashboard.

## Local Testing

Before deploying to Vercel, test locally:

```bash
cd frontend
npm install
npm run build
npm run preview
```

Then visit `http://localhost:4173` to test the built version.

## File Structure for Vercel

```
livepair/
├── vercel.json                    # Deployment configuration
├── .vercelignore                  # Files to exclude
├── frontend/                      # Deployed to Vercel
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   └── dist/                      # Built output
├── backend/                       # NOT deployed to Vercel (goes to Cloud Run)
├── extension/
└── ...
```

The `vercel.json` tells Vercel to:
1. Build: `cd frontend && npm install && npm run build`
2. Output: `frontend/dist`
3. Serve: All routes → `index.html` (SPA routing)
