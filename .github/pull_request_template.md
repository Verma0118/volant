## Summary

- 

## Why this change

- 

## Scope

- [ ] Backend
- [ ] Frontend
- [ ] Infra / Docker
- [ ] Docs only

## Validation

- [ ] `cd platform && npm run verify`
- [ ] If backend changed: `cd platform && npm run backend:migrate && npm run backend:seed`
- [ ] If UI changed: manual smoke check of impacted flow

## Architecture / Modularity Checklist

- [ ] No direct deep cross-feature imports in frontend
- [ ] New SQL lives in `backend/src/repositories/`
- [ ] Route handlers remain thin (`backend/src/routes/`)
- [ ] Runtime config changes only in `backend/src/config.js`
- [ ] No hardcoded UI colors (tokens only)

## Onboarding Impact

- [ ] Updated `platform/ARCHITECTURE.md` if boundaries changed
- [ ] Updated `platform/CONTRIBUTING.md` if setup/check flow changed
