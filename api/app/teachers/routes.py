from flask import Blueprint, jsonify, request, current_app
from app.services.teacher_service import (
    get_all_teachers, get_teacher_by_id, create_teacher,
    update_teacher, delete_teacher
)

teachers_bp = Blueprint('teachers', __name__)


@teachers_bp.route('/', methods=['GET'])
def list_teachers():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    teachers = get_all_teachers()
    if teachers is None:
        current_app.logger.error("[ROUTE] list_teachers: service returned None")
        return jsonify({'error': 'Failed to fetch teachers'}), 500
    return jsonify(teachers)


@teachers_bp.route('/<int:teacher_id>', methods=['GET'])
def get_teacher(teacher_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - teacher_id={teacher_id}")
    teacher = get_teacher_by_id(teacher_id)
    if teacher is None:
        current_app.logger.warning(f"[ROUTE] get_teacher: not found teacher_id={teacher_id}")
        return jsonify({'error': 'Teacher not found'}), 404
    return jsonify(teacher)


@teachers_bp.route('/', methods=['POST'])
def add_teacher():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or not all(key in data for key in ['teacher_name', 'subject', 'username', 'password']):
        current_app.logger.warning("[VALIDATION] add_teacher: missing required fields")
        return jsonify({'error': 'Missing required fields: teacher_name, subject, username, password'}), 400

    result = create_teacher(data)
    if result is None:
        current_app.logger.error("[ROUTE] add_teacher: service returned None")
        return jsonify({'error': 'Failed to create teacher'}), 500
    return jsonify({'message': 'Teacher created successfully', 'id': result}), 201


@teachers_bp.route('/<int:teacher_id>', methods=['PUT'])
def edit_teacher(teacher_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - teacher_id={teacher_id}")
    data = request.get_json()
    if not data or not all(key in data for key in ['teacher_name', 'subject', 'username', 'password']):
        current_app.logger.warning("[VALIDATION] edit_teacher: missing required fields")
        return jsonify({'error': 'Missing required fields: teacher_name, subject, username, password'}), 400

    if not update_teacher(teacher_id, data):
        current_app.logger.warning(f"[ROUTE] edit_teacher: not found or update failed teacher_id={teacher_id}")
        return jsonify({'error': 'Teacher not found or update failed'}), 404
    return jsonify({'message': 'Teacher updated successfully'})


@teachers_bp.route('/<int:teacher_id>', methods=['DELETE'])
def remove_teacher(teacher_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - teacher_id={teacher_id}")
    if not delete_teacher(teacher_id):
        current_app.logger.warning(f"[ROUTE] remove_teacher: not found or delete failed teacher_id={teacher_id}")
        return jsonify({'error': 'Teacher not found or delete failed'}), 404
    return jsonify({'message': 'Teacher deleted successfully'})
