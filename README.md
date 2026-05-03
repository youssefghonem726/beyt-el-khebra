🚀 Project Collaboration Guide

Stack: React + Django + Supabase auth
Goal: Work together without conflicts, broken builds, or confusion

📦 Project Structure
/frontend     # React app
/backend      # Django backend
/database     # DB scripts (optional)
/docs         # API contracts
/infra        # deployment + CI/CD


🌿 Branching Strategy
Branch	  Purpose
main	    Production (live app)
staging	  Pre-production testing
develop	  Integration branch
feature/*	Your work


🧭 Step-by-Step Developer Workflow
1. Start from latest code
git checkout develop
git pull origin develop

2. Create your feature branch
git checkout -b feature/your-feature-name

Examples:
feature/login-api
feature/cart-ui
fix/payment-bug

3. Do your work
Backend → /backend
Frontend → /frontend
Follow API contracts in /docs/api.md

Run locally:
# backend
cd backend
python manage.py runserver

# frontend
cd frontend
npm run dev

4. Commit your changes
git add .
git commit -m "feat: short clear description"

Examples:
feat: add order creation endpoint
fix: correct price calculation
refactor: split auth logic

5. Sync with team (DO THIS DAILY)
git checkout develop
git pull origin develop

git checkout feature/your-feature-name
git rebase develop

👉 Fix conflicts immediately if they appear.

6. Push your branch
git push origin feature/your-feature-name

7. Open Pull Request → develop

On GitHub:

Base: develop
Compare: your feature branch
Add clear description
Request review

8. After approval
Use Squash Merge
Delete your branch

🔄 Full Feature Flow (IMPORTANT)

For features touching both frontend & backend:

1. Define API first

Update /docs/api.md:

POST /api/v1/orders/

Request:
{
  "items": [...]
}

Response:
{
  "id": number,
  "status": "pending"
}

2. Implement backend (Django)
cd backend
python manage.py makemigrations
python manage.py migrate

3. Implement frontend (React)

Use centralized API calls:

// frontend/src/api/orders.js

4. Test everything locally
Backend works
Frontend works
No errors
🗄️ Database Rules (Django + MySQL)
Always run:
python manage.py migrate

Never edit old migrations
Always commit new migrations
Resolve migration conflicts BEFORE PR


🚀 Deployment Flow
feature → develop → staging → main
Staging
git checkout staging
git merge develop

Deploy
Test everything

Production
git checkout main
git merge staging
Deploy backend
Run migrations
Deploy frontend

🚑 Hotfix (Production Bug)
git checkout main
git checkout -b hotfix/bug-name

Fix → commit → PR → main

Then sync back:

git checkout develop
git merge main

git checkout staging
git merge main
⚠️ Rules (STRICT)
❌ No direct push to main or staging
❌ No long-lived branches
❌ No huge PRs
❌ No breaking APIs without versioning

✅ Best Practices
Keep PRs small (1 feature only)
Rebase daily
Communicate what you’re working on
Split large files into smaller modules
Use API versioning (/api/v1/)

🧠 Quick Summary
Pull → Branch → Code → Commit → Rebase → Push → PR → Merge

🔧 Tools
Version control: GitHub
API testing: Postman


📌 Final Note

If something breaks:

Check develop
Rebase your branch
Fix locally BEFORE pushing
