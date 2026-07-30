from flask import current_app
from app.utility.db_connection import get_db_connection


def get_all_students():
    current_app.logger.debug("[SERVICE] get_all_students called")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, student_id, name, class_id FROM students")
            students = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_all_students: returned {len(students)} students")
            return students
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_all_students failed: {str(e)}")
        return None


def get_student_by_id(student_id):
    current_app.logger.debug(f"[SERVICE] get_student_by_id called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, student_id, name, class_id FROM students WHERE student_id = %s", (student_id,))
            student = cursor.fetchone()
            if student is None:
                current_app.logger.debug(f"[SERVICE] get_student_by_id: not found student_id={student_id}")
                return None

            cursor.execute("SELECT id, student_id, subject, type, score FROM scores WHERE student_id = %s", (student_id,))
            student['scores'] = cursor.fetchall()

            current_app.logger.info(f"[SERVICE] get_student_by_id: found, {len(student['scores'])} scores")
            return student
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_student_by_id failed: {str(e)}")
        return None


def create_student(student_data):
    current_app.logger.debug(f"[SERVICE] create_student called: student_id={student_data.get('student_id')}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO students (student_id, name, password, class_id) VALUES (%s, %s, %s, %s)",
                (student_data['student_id'], student_data['name'], student_data['password'], student_data.get('class_id'))
            )
            conn.commit()
            lastrowid = cursor.lastrowid
            current_app.logger.info(f"[DB] INSERT student student_id={student_data['student_id']}, auto_id={lastrowid}")
            return lastrowid
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] create_student failed: {str(e)}")
        return None


def update_student(student_id, student_data):
    current_app.logger.debug(f"[SERVICE] update_student called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "UPDATE students SET name = %s, password = %s, class_id = %s WHERE student_id = %s",
                (student_data['name'], student_data['password'], student_data.get('class_id'), student_id)
            )
            conn.commit()
            updated = cursor.rowcount > 0
            current_app.logger.info(f"[DB] UPDATE student student_id={student_id}, affected={updated}")
            return updated
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] update_student failed: {str(e)}")
        return False


def delete_student(student_id):
    current_app.logger.debug(f"[SERVICE] delete_student called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute("DELETE FROM scores WHERE student_id = %s", (student_id,))
            scores_deleted = cursor.rowcount
            current_app.logger.info(f"[DB] DELETE scores for student_id={student_id}, deleted={scores_deleted}")

            cursor.execute("DELETE FROM students WHERE student_id = %s", (student_id,))
            conn.commit()
            deleted = cursor.rowcount > 0
            current_app.logger.info(f"[DB] DELETE student student_id={student_id}, affected={deleted}")
            return deleted
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] delete_student failed: {str(e)}")
        return False
