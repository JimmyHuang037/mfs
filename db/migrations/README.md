# Database Migrations

按编号顺序命名的 SQL 文件，CI/CD 流水线会自动执行：

```
001_add_example_column.sql
002_create_new_table.sql
```

每个文件应该是幂等的（使用 `IF NOT EXISTS` / `IF EXISTS`），因为流水线每次部署都会扫描此目录。
