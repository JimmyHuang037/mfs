from flask import current_app
from app.utility.db_connection import get_db_connection


def get_all_classes():
    current_app.logger.debug("[SERVICE] get_all_classes called")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT class_id, class_name FROM classes")
            classes = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_all_classes: returned {len(classes)} classes")
            return classes
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_all_classes failed: {str(e)}")
        return None


def get_class_by_id(class_id):
    current_app.logger.debug(f"[SERVICE] get_class_by_id called: class_id={class_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT class_id, class_name FROM classes WHERE class_id = %s", (class_id,))
            cls = cursor.fetchone()
            if cls is None:
                current_app.logger.debug(f"[SERVICE] get_class_by_id: not found class_id={class_id}")
                return None

            cursor.execute(
                """SELECT t.teacher_id, t.teacher_name, t.subject FROM teachers t
                   JOIN teacher_class tc ON t.teacher_id = tc.teacher_id
                   WHERE tc.class_id = %s""",
                (class_id,)
            )
            cls['teachers'] = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_class_by_id: found, {len(cls['teachers'])} teachers")
            return cls
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_class_by_id failed: {str(e)}")
        return None


def create_class(class_data):
    current_app.logger.debug(f"[SERVICE] create_class called: class_name={class_data.get('class_name')}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO classes (class_name) VALUES (%s)",
                (class_data['class_name'],)
            )
            conn.commit()
            lastrowid = cursor.lastrowid
            current_app.logger.info(f"[DB] INSERT class class_name={class_data['class_name']}, auto_id={lastrowid}")
            return lastrowid
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] create_class failed: {str(e)}")
        return None


def update_class(class_id, class_data):
    current_app.logger.debug(f"[SERVICE] update_class called: class_id={class_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "UPDATE classes SET class_name = %s WHERE class_id = %s",
                (class_data['class_name'], class_id)
            )
            conn.commit()
            updated = cursor.rowcount > 0
            current_app.logger.info(f"[DB] UPDATE class class_id={class_id}, affected={updated}")
            return updated
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] update_class failed: {str(e)}")
        return False


def delete_class(class_id):
    current_app.logger.debug(f"[SERVICE] delete_class called: class_id={class_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute("DELETE FROM teacher_class WHERE class_id = %s", (class_id,))
            links_deleted = cursor.rowcount
            current_app.logger.info(f"[DB] DELETE teacher_class links: class_id={class_id}, deleted={links_deleted}")

            cursor.execute("DELETE FROM classes WHERE class_id = %s", (class_id,))
            conn.commit()
            deleted = cursor.rowcount > 0
            current_app.logger.info(f"[DB] DELETE class class_id={class_id}, affected={deleted}")
            return deleted
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] delete_class failed: {str(e)}")
        return False
