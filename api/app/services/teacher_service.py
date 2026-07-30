from flask import current_app
from app.utility.db_connection import get_db_connection


def get_all_teachers():
    current_app.logger.debug("[SERVICE] get_all_teachers called")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT teacher_id, teacher_name, subject, username FROM teachers")
            teachers = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_all_teachers: returned {len(teachers)} teachers")
            return teachers
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_all_teachers failed: {str(e)}")
        return None


def get_teacher_by_id(teacher_id):
    current_app.logger.debug(f"[SERVICE] get_teacher_by_id called: teacher_id={teacher_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT teacher_id, teacher_name, subject, username FROM teachers WHERE teacher_id = %s",
                (teacher_id,)
            )
            teacher = cursor.fetchone()
            if teacher is None:
                current_app.logger.debug(f"[SERVICE] get_teacher_by_id: not found teacher_id={teacher_id}")
                return None

            cursor.execute(
                """SELECT c.class_id, c.class_name FROM classes c
                   JOIN teacher_class tc ON c.class_id = tc.class_id
                   WHERE tc.teacher_id = %s""",
                (teacher_id,)
            )
            teacher['classes'] = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_teacher_by_id: found, {len(teacher['classes'])} classes")
            return teacher
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_teacher_by_id failed: {str(e)}")
        return None


def create_teacher(teacher_data):
    current_app.logger.debug(f"[SERVICE] create_teacher called: username={teacher_data.get('username')}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO teachers (teacher_name, subject, username, password) VALUES (%s, %s, %s, %s)",
                (teacher_data['teacher_name'], teacher_data['subject'], teacher_data['username'], teacher_data['password'])
            )
            conn.commit()
            lastrowid = cursor.lastrowid
            current_app.logger.info(f"[DB] INSERT teacher username={teacher_data['username']}, auto_id={lastrowid}")

            if 'class_ids' in teacher_data and teacher_data['class_ids']:
                for class_id in teacher_data['class_ids']:
                    cursor.execute(
                        "INSERT INTO teacher_class (teacher_id, class_id) VALUES (%s, %s)",
                        (lastrowid, class_id)
                    )
                conn.commit()
                current_app.logger.info(f"[DB] INSERT teacher_class links: teacher_id={lastrowid}, classes={teacher_data['class_ids']}")

            return lastrowid
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] create_teacher failed: {str(e)}")
        return None


def update_teacher(teacher_id, teacher_data):
    current_app.logger.debug(f"[SERVICE] update_teacher called: teacher_id={teacher_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "UPDATE teachers SET teacher_name = %s, subject = %s, username = %s, password = %s WHERE teacher_id = %s",
                (teacher_data['teacher_name'], teacher_data['subject'], teacher_data['username'], teacher_data['password'], teacher_id)
            )
            conn.commit()
            updated = cursor.rowcount > 0
            current_app.logger.info(f"[DB] UPDATE teacher teacher_id={teacher_id}, affected={updated}")
            return updated
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] update_teacher failed: {str(e)}")
        return False


def delete_teacher(teacher_id):
    current_app.logger.debug(f"[SERVICE] delete_teacher called: teacher_id={teacher_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute("DELETE FROM teacher_class WHERE teacher_id = %s", (teacher_id,))
            links_deleted = cursor.rowcount
            current_app.logger.info(f"[DB] DELETE teacher_class links: teacher_id={teacher_id}, deleted={links_deleted}")

            cursor.execute("DELETE FROM teachers WHERE teacher_id = %s", (teacher_id,))
            conn.commit()
            deleted = cursor.rowcount > 0
            current_app.logger.info(f"[DB] DELETE teacher teacher_id={teacher_id}, affected={deleted}")
            return deleted
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] delete_teacher failed: {str(e)}")
        return False
