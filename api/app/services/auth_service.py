from flask import current_app
from app.utility.db_connection import get_db_connection


def authenticate_student(student_id, password):
    current_app.logger.debug(f"[SERVICE] authenticate_student called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT student_id, name, class_id FROM students WHERE student_id = %s AND password = %s",
                (student_id, password)
            )
            student = cursor.fetchone()
            if student is None:
                current_app.logger.debug(f"[SERVICE] authenticate_student: no match for student_id={student_id}")
                return None

            cursor.execute(
                "SELECT id, student_id, subject, type, score FROM scores WHERE student_id = %s",
                (student_id,)
            )
            scores = cursor.fetchall()
            student['scores'] = scores

            current_app.logger.info(f"[SERVICE] authenticate_student: success, {len(scores)} scores found")
            return student
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] authenticate_student failed: {str(e)}")
        return None


def authenticate_teacher(username, password):
    current_app.logger.debug(f"[SERVICE] authenticate_teacher called: username={username}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT teacher_id, teacher_name, subject, username FROM teachers WHERE username = %s AND password = %s",
                (username, password)
            )
            teacher = cursor.fetchone()
            if teacher is None:
                current_app.logger.debug(f"[SERVICE] authenticate_teacher: no match for username={username}")
                return None

            cursor.execute(
                """SELECT c.class_id, c.class_name FROM classes c
                   JOIN teacher_class tc ON c.class_id = tc.class_id
                   WHERE tc.teacher_id = %s""",
                (teacher['teacher_id'],)
            )
            classes = cursor.fetchall()
            teacher['classes'] = classes

            current_app.logger.info(f"[SERVICE] authenticate_teacher: success, {len(classes)} classes assigned")
            return teacher
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] authenticate_teacher failed: {str(e)}")
        return None


def authenticate_admin(username, password):
    current_app.logger.debug(f"[SERVICE] authenticate_admin called: username={username}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT id, username, name FROM admins WHERE username = %s AND password = %s",
                (username, password)
            )
            admin = cursor.fetchone()
            if admin is None:
                current_app.logger.debug(f"[SERVICE] authenticate_admin: no match for username={username}")
                return None

            current_app.logger.info(f"[SERVICE] authenticate_admin: success, name={admin['name']}")
            return admin
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] authenticate_admin failed: {str(e)}")
        return None
