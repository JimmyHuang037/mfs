from flask import Blueprint, request, jsonify, current_app
from app.services.auth_service import authenticate_student, authenticate_teacher, authenticate_admin

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login/student', methods=['POST'])
def login_student():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or 'student_id' not in data or 'password' not in data:
        current_app.logger.warning("[VALIDATION] missing student_id or password")
        return jsonify({'error': 'Missing student_id or password'}), 400

    student_id = data['student_id']
    password = data['password']
    current_app.logger.info(f"[AUTH] student login attempt: student_id={student_id}")

    result = authenticate_student(student_id, password)
    if result is None:
        current_app.logger.warning(f"[AUTH] student login failed: student_id={student_id}, reason=invalid_credentials")
        return jsonify({'error': 'Invalid credentials'}), 401

    current_app.logger.info(f"[AUTH] student login success: student_id={student_id}, name={result['name']}")
    return jsonify(result)


@auth_bp.route('/login/teacher', methods=['POST'])
def login_teacher():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        current_app.logger.warning("[VALIDATION] missing username or password")
        return jsonify({'error': 'Missing username or password'}), 400

    username = data['username']
    password = data['password']
    current_app.logger.info(f"[AUTH] teacher login attempt: username={username}")

    result = authenticate_teacher(username, password)
    if result is None:
        current_app.logger.warning(f"[AUTH] teacher login failed: username={username}, reason=invalid_credentials")
        return jsonify({'error': 'Invalid credentials'}), 401

    current_app.logger.info(f"[AUTH] teacher login success: username={username}, name={result['teacher_name']}")
    return jsonify(result)


@auth_bp.route('/login/admin', methods=['POST'])
def login_admin():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        current_app.logger.warning("[VALIDATION] missing username or password")
        return jsonify({'error': 'Missing username or password'}), 400

    username = data['username']
    password = data['password']
    current_app.logger.info(f"[AUTH] admin login attempt: username={username}")

    result = authenticate_admin(username, password)
    if result is None:
        current_app.logger.warning(f"[AUTH] admin login failed: username={username}, reason=invalid_credentials")
        return jsonify({'error': 'Invalid credentials'}), 401

    current_app.logger.info(f"[AUTH] admin login success: username={username}, name={result['name']}")
    return jsonify(result)
