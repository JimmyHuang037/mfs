# MFS - 学生信息管理系统

Monorepo for student management system (MFS).

## Structure

```
mfs/
├── api/          # Flask REST API backend
├── web/          # Angular frontend
├── e2e/          # Playwright end-to-end tests
└── db/           # Database scripts
```

## Quick Start

### 1. Database

```bash
mysql -u root -p < db/students_db.sql
```

### 2. API

```bash
cd api
pip install -r requirements.txt
python run.py
```

### 3. Web

```bash
cd web
npm install
ng serve
```

### 4. E2E Tests

```bash
cd e2e
npm install
npx playwright test
```