# Contributing to Volant Platform

This guide keeps changes modular and onboarding-friendly.

## Local Setup

0. `nvm use` (uses `platform/.nvmrc`, Node 24)
1. `cd platform`
2. `cp .env.example .env`
3. `docker compose up -d`
4. `cd backend && npm install && npm run migrate && npm run seed`
5. `npm run dev` (backend terminal)
6. `npm run simulator` (backend terminal)
7. `cd ../frontend && npm install && npm run dev`

## Required Checks Before PR

- Backend: `cd backend && npm run migrate && npm run seed`
- Frontend: `cd frontend && npm run lint && npm run build`
- Smoke: `curl http://localhost:3001/health` returns `{"status":"ok"}`
- Scripted smoke: `cd backend && npm run smoke:health`
- One-command verify: `cd .. && cd platform && npm run verify`

## Code Organization Rules

- Put DB query logic in `backend/src/repositories/`.
- Keep route handlers thin in `backend/src/routes/`.
- Keep infrastructure/stateful integrations in `backend/src/services/`.
- Keep React feature logic inside `frontend/src/features/<feature-name>/`.
- Keep reusable display components in `frontend/src/shared/components/`.

## First Hour Checklist (New Dev)

- Read `README.md`, then `ARCHITECTURE.md`.
- Run local stack and validate health endpoint.
- Open `frontend/src/App.jsx` and trace route -> feature modules.
- Open `backend/src/index.js` and trace startup -> services/routes.
- Ship one small change with lint/build passing.

## Decision Records

- Use `platform/docs/adr/0000-template.md` for significant architecture choices.
