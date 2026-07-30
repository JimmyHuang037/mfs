from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from app.services.score_service import (
    get_scores, get_all_scores, add_score, update_score, delete_score,
    get_exam_types, get_score_overview, get_score_details,
    get_segment_stats, get_top_students, import_scores_xlsx,
    get_learning_advice,
)

scores_bp = Blueprint('scores', __name__)


@scores_bp.route('/', methods=['GET'])
def list_all_scores():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    scores = get_all_scores()
    if scores is None:
        current_app.logger.error("[ROUTE] list_all_scores: service returned None")
        return jsonify({'error': 'Failed to fetch scores'}), 500
    return jsonify(scores)


@scores_bp.route('/student/<string:student_id>', methods=['GET'])
def list_scores(student_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - student_id={student_id}")
    scores = get_scores(student_id)
    if scores is None:
        current_app.logger.error(f"[ROUTE] list_scores: service returned None for student_id={student_id}")
        return jsonify({'error': 'Failed to fetch scores'}), 500
    return jsonify(scores)


@scores_bp.route('/', methods=['POST'])
def add_score_route():
    current_app.logger.info(f"[ROUTE] {request.method} {request.path}")
    data = request.get_json()
    if not data or not all(key in data for key in ['student_id', 'subject', 'type', 'score']):
        current_app.logger.warning("[VALIDATION] add_score: missing required fields")
        return jsonify({'error': 'Missing required fields: student_id, subject, type, score'}), 400

    result = add_score(data['student_id'], data['subject'], data['type'], data['score'])
    if result is None:
        current_app.logger.error("[ROUTE] add_score: service returned None")
        return jsonify({'error': 'Failed to add score'}), 500
    return jsonify({'message': 'Score added successfully', 'id': result}), 201


@scores_bp.route('/<int:score_id>', methods=['PUT'])
def edit_score(score_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - score_id={score_id}")
    data = request.get_json()
    if not data:
        current_app.logger.warning("[VALIDATION] edit_score: no data provided")
        return jsonify({'error': 'No data provided'}), 400

    subject = data.get('subject')
    score_type = data.get('type')
    score_value = data.get('score')

    if subject is None and score_type is None and score_value is None:
        current_app.logger.warning("[VALIDATION] edit_score: no fields to update")
        return jsonify({'error': 'No fields to update'}), 400

    if not update_score(score_id, subject, score_type, score_value):
        current_app.logger.warning(f"[ROUTE] edit_score: not found or update failed score_id={score_id}")
        return jsonify({'error': 'Score not found or update failed'}), 404
    return jsonify({'message': 'Score updated successfully'})


@scores_bp.route('/<int:score_id>', methods=['DELETE'])
def remove_score(score_id):
    current_app.logger.info(f"[ROUTE] {request.method} {request.path} - score_id={score_id}")
    if not delete_score(score_id):
        current_app.logger.warning(f"[ROUTE] remove_score: not found or delete failed score_id={score_id}")
        return jsonify({'error': 'Score not found or delete failed'}), 404
    return jsonify({'message': 'Score deleted successfully'})


# ============================================================
# 学生成绩查询系统 — 新接口
# ============================================================

@scores_bp.route('/exam-types', methods=['GET'])
def exam_types():
    """获取学生可用的考试类型及最近日期"""
    student_id = request.args.get('student_id')
    if not student_id:
        return jsonify({'error': 'Missing student_id'}), 400
    current_app.logger.info(f"[ROUTE] GET /api/scores/exam-types?student_id={student_id}")
    result = get_exam_types(student_id)
    if result is None:
        return jsonify({'error': 'Failed to fetch exam types'}), 500
    return jsonify({'exam_types': result})


@scores_bp.route('/overview', methods=['GET'])
def overview():
    """成绩总览：总分、排名、等级"""
    student_id = request.args.get('student_id')
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([student_id, exam_type, exam_date]):
        return jsonify({'error': 'Missing required params: student_id, type, exam_date'}), 400
    current_app.logger.info(f"[ROUTE] GET /api/scores/overview?student_id={student_id}&type={exam_type}&exam_date={exam_date}")
    result = get_score_overview(student_id, exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch overview'}), 500
    return jsonify(result)


@scores_bp.route('/details', methods=['GET'])
def details():
    """成绩明细：各科分数 + 平均分"""
    student_id = request.args.get('student_id')
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([student_id, exam_type, exam_date]):
        return jsonify({'error': 'Missing required params: student_id, type, exam_date'}), 400
    current_app.logger.info(f"[ROUTE] GET /api/scores/details?student_id={student_id}&type={exam_type}&exam_date={exam_date}")
    result = get_score_details(student_id, exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch details'}), 500
    return jsonify(result)


@scores_bp.route('/segment-stats', methods=['GET'])
def segment_stats():
    """分数段统计（直方图数据）"""
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    dimension = request.args.get('dimension', 'grade')  # 'class' or 'grade'
    class_id = request.args.get('class_id')
    student_id = request.args.get('student_id')
    if not all([exam_type, exam_date]):
        return jsonify({'error': 'Missing required params: type, exam_date'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/scores/segment-stats?type={exam_type}&exam_date={exam_date}&dimension={dimension}")
    result = get_segment_stats(exam_type, exam_date, dimension, class_id, student_id)
    if result is None:
        return jsonify({'error': 'Failed to fetch segment stats'}), 500
    return jsonify(result)


@scores_bp.route('/top-students', methods=['GET'])
def top_students():
    """单科年级前三 + 总分年级前十"""
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([exam_type, exam_date]):
        return jsonify({'error': 'Missing required params: type, exam_date'}), 400
    current_app.logger.info(f"[ROUTE] GET /api/scores/top-students?type={exam_type}&exam_date={exam_date}")
    result = get_top_students(exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch top students'}), 500
    return jsonify(result)


@scores_bp.route('/import-xlsx', methods=['POST'])
def import_xlsx():
    """上传 xlsx 文件批量导入成绩"""
    current_app.logger.info(f"[ROUTE] POST /api/scores/import-xlsx")
    if 'file' not in request.files:
        current_app.logger.warning("[VALIDATION] import_xlsx: no file provided")
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        current_app.logger.warning("[VALIDATION] import_xlsx: empty filename")
        return jsonify({'error': 'No file selected'}), 400

    filename = secure_filename(file.filename)
    if not filename.endswith(('.xlsx', '.xls')):
        current_app.logger.warning(f"[VALIDATION] import_xlsx: invalid file type: {filename}")
        return jsonify({'error': 'Only .xlsx and .xls files are allowed'}), 400

    current_app.logger.info(f"[ROUTE] import_xlsx: processing file={filename}")
    result = import_scores_xlsx(file)
    return jsonify(result)


@scores_bp.route('/learning-advice', methods=['GET'])
def learning_advice():
    """获取学生学习建议：趋势+百分位+文案"""
    student_id = request.args.get('student_id')
    current_app.logger.info(f"[ROUTE] GET /api/scores/learning-advice?student_id={student_id}")
    if not student_id:
        return jsonify({'error': 'student_id is required'}), 400
    result = get_learning_advice(student_id)
    if result is None:
        return jsonify({'error': 'Failed to generate advice'}), 500
    return jsonify(result)
