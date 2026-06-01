# Contributing Guide

This document explains the development workflow used for collaborating on the Beyt El Khebra project.

## Project Structure

```text
frontend/     React application
backend/      Django REST API
database/     PostgreSQL scripts and database files
docs/         API documentation
infra/        Infrastructure and configuration files
```

## Branching Strategy

| Branch    | Purpose                  |
| --------- | ------------------------ |
| main      | Stable production branch |
| staging   | Pre-production testing   |
| develop   | Integration branch       |
| feature/* | Feature development      |
| hotfix/*  | Production bug fixes     |

## Developer Workflow

1. Start from the latest code:

```bash
git checkout develop
git pull origin develop
```

2. Create a feature branch:

```bash
git checkout -b feature/feature-name
```

Examples:

```text
feature/login-api
feature/order-workflow
fix/invoice-calculation
```

3. Work in the correct folder:

```text
backend/   Backend development
frontend/  Frontend development
docs/      API documentation
```

4. Run the project locally:

Backend:

```bash
cd backend
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm run dev
```

5. Commit changes:

```bash
git add .
git commit -m "feat: short clear description"
```

Example commit messages:

```text
feat: add order creation endpoint
fix: correct invoice calculation
refactor: split authentication logic
```

6. Sync with the team regularly:

```bash
git checkout develop
git pull origin develop

git checkout feature/feature-name
git rebase develop
```

7. Push your branch:

```bash
git push origin feature/feature-name
```

8. Open a Pull Request:

```text
Base: develop
Compare: your feature branch
```

Add a clear description and request review.

## Full Feature Flow

For features that include both frontend and backend work:

1. Define or update the API contract
2. Implement the backend
3. Test the backend endpoints
4. Implement frontend integration
5. Test the full workflow locally
6. Open a Pull Request

## Database Rules

* Always run migrations before testing backend changes
* Never edit old migrations
* Commit new migrations with the related feature
* Resolve migration conflicts before opening a Pull Request

Common commands:

```bash
python manage.py makemigrations
python manage.py migrate
```

## Deployment Flow

```text
feature → develop → staging → main
```

## Hotfix Flow

```bash
git checkout main
git checkout -b hotfix/bug-name
```

After fixing the issue, merge the hotfix back into the active branches.

## Rules

* Do not push directly to `main`
* Do not push directly to `staging`
* Keep Pull Requests small and focused
* Avoid long-lived branches
* Do not break existing APIs without versioning
* Communicate changes that affect frontend-backend integration

## Best Practices

* Pull and rebase frequently
* Use clear commit messages
* Keep each Pull Request focused on one feature or fix
* Test backend and frontend before opening a Pull Request
* Update API documentation when endpoints change

## Tools

* GitHub
* Postman
* Django REST Framework
* React
