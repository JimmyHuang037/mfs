import mysql.connector
from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool, PoolError
from flask import current_app
from config import Config

_pool = None


def _get_pool():
    global _pool
    if _pool is None:
        _pool = MySQLConnectionPool(
            pool_name="mfs_pool",
            pool_size=10,
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset='utf8mb4'
        )
        try:
            current_app.logger.info(f"[DB] connection pool created: size=10, host={Config.DB_HOST}/{Config.DB_NAME}")
        except RuntimeError:
            pass  # 应用上下文未就绪时忽略日志
    return _pool


class DBConnection:
    """Context manager for pooled database connections."""

    def __enter__(self):
        try:
            pool = _get_pool()
            self.conn = pool.get_connection()
            current_app.logger.debug(f"[DB] connection acquired from pool ({Config.DB_HOST}/{Config.DB_NAME})")
            return self.conn
        except (Error, PoolError) as e:
            current_app.logger.error(f"[DB_ERROR] failed to get connection from pool: {str(e)}")
            raise

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn and self.conn.is_connected():
            self.conn.close()
            current_app.logger.debug("[DB] connection returned to pool")


def get_db_connection():
    """Return a new DBConnection context manager."""
    return DBConnection()
