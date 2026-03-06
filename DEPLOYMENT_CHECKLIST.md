# LivePair Deployment Checklist

## Pre-Deployment (Days 8-9)

### Backend Preparation (Cloud Run)
- [ ] Verify Dockerfile builds locally: `docker build -t livepair-backend backend/`
- [ ] Test locally: `docker run -p 8080:8080 livepair-backend`
- [ ] Check GCP project is created and Gemini API is enabled
- [ ] Service account has Vertex AI access
- [ ] Credentials JSON is downloaded
- [ ] Environment variables are set (.env file locally)

### Frontend Preparation (Vercel)
- [ ] Frontend builds locally: `cd frontend && npm run build`
- [ ] Build output exists: `frontend/dist/index.html`
- [ ] Vite config is correct: `frontend/vite.config.ts`
- [ ] WebSocket client properly configured to use `VITE_BACKEND_URL`
- [ ] All components render without errors in dev mode
- [ ] Test locally: `npm run preview`

## Deployment Order

### Step 1: Deploy Backend to Cloud Run (Day 8)
```bash
./scripts/deploy-backend.sh <project-id> <gemini-api-key>
```

- [ ] Deployment script runs without errors
- [ ] Cloud Run service is created
- [ ] Public endpoint URL is noted
- [ ] Test backend health check
- [ ] Verify WebSocket connection works: `wscat -c wss://livepair-backend-xxx.run.app`

### Step 2: Configure Vercel Environment Variable (Day 8)
- [ ] Go to Vercel Dashboard → Settings → Environment Variables
- [ ] Add `VITE_BACKEND_URL` = `https://livepair-backend-xxx.run.app` (replace with actual URL)
- [ ] Redeploy frontend OR push new commit to trigger redeploy

### Step 3: Deploy Frontend to Vercel (Day 8)
- [ ] Push repository to GitHub
- [ ] Vercel automatically detects changes
- [ ] Monitor build logs in Vercel Dashboard
- [ ] Verify build completes successfully
- [ ] Frontend deployed to `https://v0-gemini-live-agent-challenge.vercel.app`

### Step 4: Post-Deployment Verification (Day 8-9)

#### Frontend (Vercel)
- [ ] Visit frontend URL, no 404 errors
- [ ] Page loads with dark UI
- [ ] Audio controls visible
- [ ] Code editor visible
- [ ] Status bar shows "Disconnected"
- [ ] Browser console has no critical errors (check DevTools)

#### Backend Connectivity
- [ ] Status bar shows "Connected" after loading
- [ ] Console shows successful WebSocket connection
- [ ] Backend URL is correct in environment variables
- [ ] No CORS errors in browser console

#### End-to-End Testing
- [ ] Click audio capture button (should show "Listening")
- [ ] Speak something
- [ ] Check console for audio chunk sending
- [ ] Verify backend receives audio (check Cloud Run logs)
- [ ] Check agent orchestrator processes audio

## Demo Preparation (Day 9)

### System Testing
- [ ] Test all 4 MCP tools work:
  - [ ] Read a file
  - [ ] Search repository
  - [ ] Apply a patch
  - [ ] Run tests
- [ ] Verify session state is maintained across messages
- [ ] Verify error recovery works (disconnect/reconnect)
- [ ] Test interruption handling (new audio while processing)

### Demo Script Rehearsal
- [ ] Write out exact demo script
- [ ] Rehearse 5 times in a row
- [ ] Time the demo (should be < 4 minutes)
- [ ] Record a backup demo video (in case of Gemini API outage)
- [ ] Test all keyboard shortcuts and commands

### Documentation
- [ ] Create architecture diagram (all 3 components)
- [ ] Update README with deployment URLs
- [ ] Prepare Cloud Run logs screenshot for demo
- [ ] Write 2-3 minute demo script with exact words
- [ ] List all technologies and why they were chosen

## Troubleshooting Deployment

### Frontend: 404 Error on Vercel
**Problem**: Page not found when visiting frontend URL
**Solutions**:
1. Check `vercel.json` exists in project root
2. Check `frontend/dist/index.html` exists in build output
3. Check Vercel build logs for errors
4. Ensure `VITE_BACKEND_URL` is set in environment

### Frontend: WebSocket Connection Fails
**Problem**: Status bar shows "Disconnected", console shows WebSocket errors
**Solutions**:
1. Verify `VITE_BACKEND_URL` environment variable is set in Vercel
2. Check backend URL is accessible and has CORS enabled
3. Verify backend is running on Cloud Run
4. Check Cloud Run logs for connection errors
5. Test with `wscat -c <backend-url>` locally

### Backend: Gemini Live API Not Working
**Problem**: Agent doesn't respond to voice
**Solutions**:
1. Verify Gemini API is enabled in GCP project
2. Check API key is correct in `.env`
3. Verify service account has Vertex AI Gemini API access
4. Check Cloud Run logs for API errors
5. Test API locally before deployment

### Build Failures on Vercel
**Problem**: Build fails in Vercel dashboard
**Solutions**:
1. Check `frontend/package.json` has all dependencies
2. Verify `npm run build` works locally
3. Check for TypeScript errors: `npm run type-check`
4. Review Vercel build logs for specific errors
5. Ensure no hardcoded localhost URLs (use env var)

### Audio Not Streaming
**Problem**: Microphone capture not working
**Solutions**:
1. Check browser permissions (allow microphone)
2. Check browser console for permission errors
3. Verify Web Audio API is supported
4. Check audio processor is running (console logs)
5. Test with different browser if issue persists

## Final Checklist (Before Submission)

- [ ] Backend is running on Cloud Run (live and accessible)
- [ ] Frontend is running on Vercel (no 404 errors)
- [ ] Frontend connects to backend successfully
- [ ] Demo script is rehearsed and timed (< 4 minutes)
- [ ] All 4 MCP tools demonstrated
- [ ] Patch validation and application shown
- [ ] Error recovery demonstrated (reconnection)
- [ ] Cloud Run logs visible and clear
- [ ] Architecture diagram is clear
- [ ] README updated with deployment info
- [ ] GitHub repo is clean and organized
- [ ] VS Code extension compiles without errors
- [ ] Demo video recorded as backup

## Success Criteria

✅ **Frontend**: No errors, loads quickly, responsive UI
✅ **Backend**: Responds to WebSocket messages, Gemini integration works
✅ **Integration**: Voice → transcription → tool execution → code changes
✅ **Demo**: Flawless execution, clear explanations, under 4 minutes
✅ **Documentation**: Clear architecture, setup instructions, demo script
