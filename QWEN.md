# MFS - Student Management System

A monorepo for a student information management system.

## Project Structure

```
mfs/
├── api/          # Flask REST API backend (Python)
├── web/          # Angular 20 frontend (TypeScript)
├── e2e/          # Playwright end-to-end tests
└── db/           # MySQL database scripts
```

## Tech Stack

- **Backend**: Python/Flask, MySQL (mysql-connector-python), Pandas
- **Frontend**: Angular 20, Angular Material, TypeScript
- **Testing**: Playwright (E2E)
- **Database**: MySQL 8.0

## Commands

### API
- Run: `cd api && python run.py` (port 5000)
- Install deps: `cd api && pip install -r requirements.txt`

### Web
- Run: `cd web && ng serve` (port 4200)
- Install deps: `cd web && npm install`
- Build: `cd web && ng build`
- Add component: `cd web && ng generate component <name>`

### E2E
- Run tests: `cd e2e && npx playwright test`
- UI mode: `cd e2e && npx playwright test --ui`

### Database
- Import: `mysql -u root -p < db/students_db.sql`

## Git

- Default branch: `main`
- SSH remote: `git@github.com:JimmyHuang037/mfs.git`
- GitHub: https://github.com/JimmyHuang037/mfs

## Conventions

- Use `api/` for backend changes, `web/` for frontend, `e2e/` for tests
- Commit messages in English or Chinese
- .env file contains credentials, never commit it