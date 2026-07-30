from flask import Blueprint, jsonify, request, current_app
from app.services.statistics_service import (
    get_class_total_rank,
    get_subject_segments,
    get_class_top3,
    get_subject_teacher_compare,
    get_student_analysis,
    get_student_trajectory,
)

statistics_bp = Blueprint('statistics', __name__)


@statistics_bp.route('/class-total-rank', methods=['GET'])
def class_total_rank():
    """班级总分平均分排名"""
    teacher_id = request.args.get('teacher_id')
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([teacher_id, exam_type]):
        return jsonify({'error': 'Missing required params: teacher_id, type'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/statistics/class-total-rank?teacher_id={teacher_id}&type={exam_type}&exam_date={exam_date}")
    result = get_class_total_rank(int(teacher_id), exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch class total rank'}), 500
    return jsonify(result)


@statistics_bp.route('/subject-segments', methods=['GET'])
def subject_segments():
    """任教科目分数段分布"""
    class_id = request.args.get('class_id')
    teacher_id = request.args.get('teacher_id')
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([class_id, teacher_id, exam_type]):
        return jsonify({'error': 'Missing required params: class_id, teacher_id, type'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/statistics/subject-segments?class_id={class_id}&teacher_id={teacher_id}"
        f"&type={exam_type}&exam_date={exam_date}")
    result = get_subject_segments(int(class_id), int(teacher_id), exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch subject segments'}), 500
    return jsonify(result)


@statistics_bp.route('/class-top3', methods=['GET'])
def class_top3():
    """班级各科前三名"""
    class_id = request.args.get('class_id')
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([class_id, exam_type]):
        return jsonify({'error': 'Missing required params: class_id, type'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/statistics/class-top3?class_id={class_id}&type={exam_type}&exam_date={exam_date}")
    result = get_class_top3(int(class_id), exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch class top3'}), 500
    return jsonify(result)


@statistics_bp.route('/subject-teacher-compare', methods=['GET'])
def subject_teacher_compare():
    """同科老师班级平均分对比"""
    teacher_id = request.args.get('teacher_id')
    exam_type = request.args.get('type')
    exam_date = request.args.get('exam_date')
    if not all([teacher_id, exam_type]):
        return jsonify({'error': 'Missing required params: teacher_id, type'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/statistics/subject-teacher-compare?teacher_id={teacher_id}"
        f"&type={exam_type}&exam_date={exam_date}")
    result = get_subject_teacher_compare(int(teacher_id), exam_type, exam_date)
    if result is None:
        return jsonify({'error': 'Failed to fetch subject teacher compare'}), 500
    return jsonify(result)


@statistics_bp.route('/student-analysis', methods=['GET'])
def student_analysis():
    """学情分析：老师任教科目下所有学生的能力值/趋势/波动/分类"""
    teacher_id = request.args.get('teacher_id')
    if not teacher_id:
        return jsonify({'error': 'Missing required param: teacher_id'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/statistics/student-analysis?teacher_id={teacher_id}")
    result = get_student_analysis(int(teacher_id))
    if result is None:
        return jsonify({'error': 'Failed to fetch student analysis'}), 500
    return jsonify(result)


@statistics_bp.route('/student-trajectory', methods=['GET'])
def student_trajectory():
    """单个学生历次考试轨迹(含班级/年级平均分对比)"""
    student_id = request.args.get('student_id')
    subject = request.args.get('subject')
    if not all([student_id, subject]):
        return jsonify({'error': 'Missing required params: student_id, subject'}), 400
    current_app.logger.info(
        f"[ROUTE] GET /api/statistics/student-trajectory?student_id={student_id}&subject={subject}")
    result = get_student_trajectory(student_id, subject)
    if result is None:
        return jsonify({'error': 'Failed to fetch student trajectory'}), 500
    return jsonify(result)
