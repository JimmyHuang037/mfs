from flask import Blueprint, jsonify, request, current_app
from app.services.student_service import (
    get_all_students, get_student_by_id, create_student,
    update_student, delete_student
)

students_bp = Blueprint('students', __name__)


@students_bp.route('/', methods=['GET'])
def list_students():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    students = get_all_students()
    if students is None:
        current_app.logger.error("[ROUTE] list_students: service returned None")
        return jsonify({'error': 'Failed to fetch students'}), 500
    return jsonify(students)


@students_bp.route('/<string:student_id>', methods=['GET'])
def get_student(student_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - student_id={student_id}")
    student = get_student_by_id(student_id)
    if student is None:
        current_app.logger.warning(f"[ROUTE] get_student: not found student_id={student_id}")
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(student)


@students_bp.route('/', methods=['POST'])
def add_student():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or not all(key in data for key in ['student_id', 'name', 'password']):
        current_app.logger.warning("[VALIDATION] add_student: missing required fields")
        return jsonify({'error': 'Missing required fields: student_id, name, password'}), 400

    result = create_student(data)
    if result is None:
        current_app.logger.error("[ROUTE] add_student: service returned None")
        return jsonify({'error': 'Failed to create student'}), 500
    return jsonify({'message': 'Student created successfully', 'id': result}), 201


@students_bp.route('/<string:student_id>', methods=['PUT'])
def edit_student(student_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - student_id={student_id}")
    data = request.get_json()
    if not data or not all(key in data for key in ['name', 'password']):
        current_app.logger.warning("[VALIDATION] edit_student: missing required fields")
        return jsonify({'error': 'Missing required fields: name, password'}), 400

    if not update_student(student_id, data):
        current_app.logger.warning(f"[ROUTE] edit_student: not found or update failed student_id={student_id}")
        return jsonify({'error': 'Student not found or update failed'}), 404
    return jsonify({'message': 'Student updated successfully'})


@students_bp.route('/<string:student_id>', methods=['DELETE'])
def remove_student(student_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - student_id={student_id}")
    if not delete_student(student_id):
        current_app.logger.warning(f"[ROUTE] remove_student: not found or delete failed student_id={student_id}")
        return jsonify({'error': 'Student not found or delete failed'}), 404
    return jsonify({'message': 'Student deleted successfully'})
