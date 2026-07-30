from flask import Blueprint, jsonify, request, current_app
from app.services.class_service import (
    get_all_classes, get_class_by_id, create_class,
    update_class, delete_class
)
from app.utility.db_connection import get_db_connection

classes_bp = Blueprint('classes', __name__)


@classes_bp.route('/', methods=['GET'])
def list_classes():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    classes = get_all_classes()
    if classes is None:
        current_app.logger.error("[ROUTE] list_classes: service returned None")
        return jsonify({'error': 'Failed to fetch classes'}), 500
    return jsonify(classes)


@classes_bp.route('/<int:class_id>', methods=['GET'])
def get_class(class_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - class_id={class_id}")
    cls = get_class_by_id(class_id)
    if cls is None:
        current_app.logger.warning(f"[ROUTE] get_class: not found class_id={class_id}")
        return jsonify({'error': 'Class not found'}), 404
    return jsonify(cls)


@classes_bp.route('/', methods=['POST'])
def add_class():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or 'class_name' not in data:
        current_app.logger.warning("[VALIDATION] add_class: missing class_name")
        return jsonify({'error': 'Missing required field: class_name'}), 400

    result = create_class(data)
    if result is None:
        current_app.logger.error("[ROUTE] add_class: service returned None")
        return jsonify({'error': 'Failed to create class'}), 500
    return jsonify({'message': 'Class created successfully', 'id': result}), 201


@classes_bp.route('/<int:class_id>', methods=['PUT'])
def edit_class(class_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - class_id={class_id}")
    data = request.get_json()
    if not data or 'class_name' not in data:
        current_app.logger.warning("[VALIDATION] edit_class: missing class_name")
        return jsonify({'error': 'Missing required field: class_name'}), 400

    if not update_class(class_id, data):
        current_app.logger.warning(f"[ROUTE] edit_class: not found or update failed class_id={class_id}")
        return jsonify({'error': 'Class not found or update failed'}), 404
    return jsonify({'message': 'Class updated successfully'})


@classes_bp.route('/<int:class_id>', methods=['DELETE'])
def remove_class(class_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - class_id={class_id}")
    if not delete_class(class_id):
        current_app.logger.warning(f"[ROUTE] remove_class: not found or delete failed class_id={class_id}")
        return jsonify({'error': 'Class not found or delete failed'}), 404
    return jsonify({'message': 'Class deleted successfully'})


@classes_bp.route('/<int:class_id>/students', methods=['GET'])
def get_class_students(class_id):
    """获取某班所有学生列表"""
    current_app.logger.info(f"[ROUTE] GET /api/classes/{class_id}/students")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT id, student_id, name, class_id FROM students WHERE class_id = %s ORDER BY student_id",
                (class_id,)
            )
            students = cursor.fetchall()
            current_app.logger.info(f"[ROUTE] get_class_students: {len(students)} students in class_id={class_id}")
            return jsonify(students)
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_class_students failed: {str(e)}")
        return jsonify({'error': 'Failed to fetch class students'}), 500


@classes_bp.route('/<int:class_id>/scores', methods=['GET'])
def get_class_scores(class_id):
    """获取某班某次考试全部成绩"""
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    current_app.logger.info(
        f"[ROUTE] GET /api/classes/{class_id}/scores?type={exam_type}&exam_date={exam_date}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            if exam_type and exam_date:
                cursor.execute("""
                    SELECT sc.id, sc.student_id, s.name, sc.subject, sc.type, sc.score, sc.exam_date
                    FROM scores sc
                    JOIN students s ON sc.student_id = s.student_id
                    WHERE s.class_id = %s AND sc.type = %s AND sc.exam_date = %s
                    ORDER BY sc.student_id, sc.subject
                """, (class_id, exam_type, exam_date))
            else:
                cursor.execute("""
                    SELECT sc.id, sc.student_id, s.name, sc.subject, sc.type, sc.score, sc.exam_date
                    FROM scores sc
                    JOIN students s ON sc.student_id = s.student_id
                    WHERE s.class_id = %s
                    ORDER BY sc.student_id, sc.subject
                """, (class_id,))
            scores = cursor.fetchall()
            current_app.logger.info(
                f"[ROUTE] get_class_scores: {len(scores)} scores for class_id={class_id}")
            return jsonify(scores)
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_class_scores failed: {str(e)}")
        return jsonify({'error': 'Failed to fetch class scores'}), 500
