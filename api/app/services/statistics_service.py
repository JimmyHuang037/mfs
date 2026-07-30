from flask import current_app
from app.utility.db_connection import get_db_connection
from app.services.score_service import (
    SUBJECTS, SUBJECTS_LANG, SUBJECTS_SCI, EXAM_TYPE_ORDER,
    compute_assigned_scores, compute_total_score
)

# 单科分数段：语数英(0-150)和物化政原始分(0-100)使用不同分段
SCORE_SEGMENTS_LANG = [(0, 59), (60, 79), (80, 99), (100, 119), (120, 134), (135, 150)]
SCORE_SEGMENTS_SCI = [(0, 39), (40, 59), (60, 69), (70, 79), (80, 89), (90, 100)]


def resolve_exam_date(exam_type, exam_date=None):
    """If exam_date is not provided, look up the actual date from DB for this exam type."""
    if exam_date:
        return exam_date
    with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
        cursor.execute(
            "SELECT MAX(exam_date) AS d FROM scores WHERE type = %s",
            (exam_type,)
        )
        row = cursor.fetchone()
        if row and row['d']:
            resolved = str(row['d'])
            current_app.logger.info(f"[SERVICE] resolve_exam_date: type={exam_type} -> {resolved}")
            return resolved
    return None



def _simple_linear_regression(x, y):
    """简单线性回归，返回 (slope, intercept)"""
    n = len(x)
    if n < 2:
        return 0, 0
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(x[i] * y[i] for i in range(n))
    sum_xx = sum(x[i] * x[i] for i in range(n))
    denom = n * sum_xx - sum_x * sum_x
    if denom == 0:
        return 0, 0
    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def _classify_student(ability, slope, volatility, thresholds):
    """基于能力值、趋势、波动对学生分类。
    thresholds: {p25, p50, p75, mean} 班级百分位阈值
    """
    p75 = thresholds.get('p75', 75)
    p25 = thresholds.get('p25', 25)
    class_mean = thresholds.get('mean', 50)

    # 天才型：能力高 + 稳定
    if ability >= p75 and volatility < 0.15:
        return '天才型', '能力突出成绩稳定，无需额外关注', 'low'

    # 下滑型：能力中等以上 + 下降趋势明显
    if ability >= class_mean and slope < -0.5:
        return '下滑型', '能力不错但成绩下滑，需要干预', 'high'

    # 上进型：持续进步
    if slope > 1.0:
        return '上进型', '持续进步中，鼓励为主', 'medium'

    if ability >= p25 and slope > 0.5:
        return '上进型', '持续进步中，鼓励为主', 'medium'

    # 潜力型：有提升空间（主要目标群体）
    if ability >= p25 and (slope > 0 or volatility > 0.2):
        return '潜力型', '有提升空间，盯一盯就能上去', 'high'

    # 摆烂型：低能力 + 无改善
    if ability < p25 and slope <= 0:
        return '摆烂型', '成绩偏低且无改善，需了解原因', 'medium'

    # 默认：潜力型
    return '潜力型', '有提升空间，建议关注', 'medium'


def get_class_total_rank(teacher_id, exam_type, exam_date=None):
    """获取老师所教班级的赋分后总分平均分排名（从高到低）"""
    current_app.logger.debug(
        f"[SERVICE] get_class_total_rank: teacher_id={teacher_id}, type={exam_type}, date={exam_date}")
    try:
        exam_date = resolve_exam_date(exam_type, exam_date)
        if not exam_date:
            return []
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 获取老师所教班级
            cursor.execute("""
                SELECT c.class_id, c.class_name
                FROM classes c
                JOIN teacher_class tc ON c.class_id = tc.class_id
                WHERE tc.teacher_id = %s
            """, (teacher_id,))
            teacher_classes = cursor.fetchall()

            if not teacher_classes:
                return []

            # 获取这些班级所有学生的原始分
            class_ids = [c['class_id'] for c in teacher_classes]
            placeholders = ','.join(['%s'] * len(class_ids))
            cursor.execute(f"""
                SELECT s.student_id, s.class_id, sc.subject, sc.score
                FROM scores sc
                JOIN students s ON sc.student_id = s.student_id
                WHERE sc.type = %s AND sc.exam_date = %s AND s.class_id IN ({placeholders})
            """, (exam_type, exam_date, *class_ids))
            all_rows = cursor.fetchall()

            # 按学生分组
            raw_by_student = {}
            class_by_student = {}
            for r in all_rows:
                sid = r['student_id']
                if sid not in raw_by_student:
                    raw_by_student[sid] = {}
                raw_by_student[sid][r['subject']] = float(r['score'])
                class_by_student[sid] = r['class_id']

            # 计算赋分和总分
            assigned_map = compute_assigned_scores(exam_type, exam_date)
            class_totals = {}
            for sid, raw_scores in raw_by_student.items():
                assigned = assigned_map.get(sid, {})
                total = compute_total_score(raw_scores, assigned)
                cid = class_by_student[sid]
                if cid not in class_totals:
                    class_totals[cid] = []
                class_totals[cid].append(total)

            # 计算各班平均分并排名
            class_avgs = []
            for c in teacher_classes:
                cid = c['class_id']
                totals = class_totals.get(cid, [])
                avg = round(sum(totals) / len(totals), 1) if totals else 0
                class_avgs.append((cid, c['class_name'], avg))
            class_avgs.sort(key=lambda x: x[2], reverse=True)

            result = []
            for i, (cid, cname, avg) in enumerate(class_avgs):
                result.append({
                    'rank': i + 1,
                    'class_id': cid,
                    'class_name': cname,
                    'avg_total': avg,
                })

            current_app.logger.info(
                f"[SERVICE] get_class_total_rank: {len(result)} classes for teacher_id={teacher_id}")
            return result
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_class_total_rank failed: {str(e)}")
        return None


def get_subject_segments(class_id, teacher_id, exam_type, exam_date=None):
    """获取老师任教科目在某班的分数段分布"""
    current_app.logger.debug(
        f"[SERVICE] get_subject_segments: class_id={class_id}, teacher_id={teacher_id}, "
        f"type={exam_type}, date={exam_date}")
    try:
        exam_date = resolve_exam_date(exam_type, exam_date)
        if not exam_date:
            return None
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 获取老师的科目
            cursor.execute("SELECT subject FROM teachers WHERE teacher_id = %s", (teacher_id,))
            teacher_row = cursor.fetchone()
            if not teacher_row:
                current_app.logger.warning(f"[SERVICE] get_subject_segments: teacher_id={teacher_id} not found")
                return None
            subject = teacher_row['subject']

            # 获取该班该科目所有分数
            cursor.execute("""
                SELECT sc.score
                FROM scores sc
                JOIN students s ON sc.student_id = s.student_id
                WHERE s.class_id = %s AND sc.subject = %s AND sc.type = %s AND sc.exam_date = %s
            """, (class_id, subject, exam_type, exam_date))
            scores = [float(r['score']) for r in cursor.fetchall()]
            total_count = len(scores)

            segments_def = SCORE_SEGMENTS_LANG if subject in SUBJECTS_LANG else SCORE_SEGMENTS_SCI
            segments = []
            for lo, hi in segments_def:
                count = sum(1 for s in scores if lo <= s <= hi)
                pct = round(count / total_count * 100, 1) if total_count > 0 else 0
                segments.append({
                    'range': f'{lo}-{hi}',
                    'count': count,
                    'percentage': pct,
                })

            current_app.logger.info(
                f"[SERVICE] get_subject_segments: subject={subject}, {total_count} scores, {len(segments)} segments")
            return {
                'subject': subject,
                'segments': segments,
                'total_count': total_count,
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_subject_segments failed: {str(e)}")
        return None


def get_class_top3(class_id, exam_type, exam_date=None):
    """获取某班各科前三名"""
    current_app.logger.debug(
        f"[SERVICE] get_class_top3: class_id={class_id}, type={exam_type}, date={exam_date}")
    try:
        exam_date = resolve_exam_date(exam_type, exam_date)
        if not exam_date:
            return None
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            result = {}
            for subj in SUBJECTS:
                cursor.execute("""
                    SELECT sc.student_id, s.name, sc.score
                    FROM scores sc
                    JOIN students s ON sc.student_id = s.student_id
                    WHERE s.class_id = %s AND sc.subject = %s AND sc.type = %s AND sc.exam_date = %s
                    ORDER BY sc.score DESC
                    LIMIT 3
                """, (class_id, subj, exam_type, exam_date))
                rows = cursor.fetchall()
                result[subj] = [
                    {
                        'rank': i + 1,
                        'student_id': r['student_id'],
                        'name': r['name'],
                        'score': float(r['score']),
                    }
                    for i, r in enumerate(rows)
                ]
            current_app.logger.info(f"[SERVICE] get_class_top3: returned top3 for {len(SUBJECTS)} subjects")
            return result
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_class_top3 failed: {str(e)}")
        return None


def get_subject_teacher_compare(teacher_id, exam_type, exam_date=None):
    """获取同科老师所教班级的科目平均分对比"""
    current_app.logger.debug(
        f"[SERVICE] get_subject_teacher_compare: teacher_id={teacher_id}, type={exam_type}, date={exam_date}")
    try:
        exam_date = resolve_exam_date(exam_type, exam_date)
        if not exam_date:
            return None
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 获取当前老师的科目
            cursor.execute("SELECT subject FROM teachers WHERE teacher_id = %s", (teacher_id,))
            teacher_row = cursor.fetchone()
            if not teacher_row:
                current_app.logger.warning(
                    f"[SERVICE] get_subject_teacher_compare: teacher_id={teacher_id} not found")
                return None
            subject = teacher_row['subject']

            # 获取同科所有老师及其班级平均分
            cursor.execute("""
                SELECT t.teacher_id, t.teacher_name,
                       AVG(sc.score) AS avg_score
                FROM teachers t
                JOIN teacher_class tc ON t.teacher_id = tc.teacher_id
                JOIN students s ON s.class_id = tc.class_id
                JOIN scores sc ON sc.student_id = s.student_id
                WHERE t.subject = %s AND sc.subject = %s AND sc.type = %s AND sc.exam_date = %s
                GROUP BY t.teacher_id, t.teacher_name
                ORDER BY avg_score DESC
            """, (subject, subject, exam_type, exam_date))
            rows = cursor.fetchall()
            result = []
            for r in rows:
                result.append({
                    'teacher_id': r['teacher_id'],
                    'teacher_name': r['teacher_name'],
                    'avg_score': round(float(r['avg_score']), 1) if r['avg_score'] else 0,
                    'is_current': r['teacher_id'] == teacher_id,
                })
            current_app.logger.info(
                f"[SERVICE] get_subject_teacher_compare: subject={subject}, {len(result)} teachers")
            return {
                'subject': subject,
                'teachers': result,
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_subject_teacher_compare failed: {str(e)}")
        return None


def get_student_analysis(teacher_id):
    """获取老师任教科目下所有学生的学情分析(能力值/趋势/波动/分类)。
    分析所有4次考试数据，不依赖特定考试日期。
    """
    current_app.logger.debug(f"[SERVICE] get_student_analysis: teacher_id={teacher_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 获取老师信息
            cursor.execute("SELECT subject FROM teachers WHERE teacher_id = %s", (teacher_id,))
            teacher_row = cursor.fetchone()
            if not teacher_row:
                current_app.logger.warning(f"[SERVICE] get_student_analysis: teacher_id={teacher_id} not found")
                return None
            subject = teacher_row['subject']

            # 获取老师所教班级
            cursor.execute("""
                SELECT c.class_id, c.class_name
                FROM classes c
                JOIN teacher_class tc ON c.class_id = tc.class_id
                WHERE tc.teacher_id = %s
                ORDER BY c.class_id
            """, (teacher_id,))
            teacher_classes = cursor.fetchall()
            if not teacher_classes:
                current_app.logger.info(f"[SERVICE] get_student_analysis: no classes for teacher_id={teacher_id}")
                return {'subject': subject, 'classes': [], 'summary': {}}

            # 获取所有学生在老师科目的所有考试成绩
            class_ids = [c['class_id'] for c in teacher_classes]
            placeholders = ','.join(['%s'] * len(class_ids))
            cursor.execute(f"""
                SELECT s.student_id, s.name, s.class_id, sc.type, sc.score
                FROM scores sc
                JOIN students s ON sc.student_id = s.student_id
                WHERE sc.subject = %s AND s.class_id IN ({placeholders})
                ORDER BY s.student_id, FIELD(sc.type, 'monthly1', 'monthly2', 'midterm', 'final')
            """, (subject, *class_ids))
            rows = cursor.fetchall()
            if not rows:
                current_app.logger.info(f"[SERVICE] get_student_analysis: no scores for subject={subject}")
                return {'subject': subject, 'classes': [], 'summary': {}}

            # 按学生分组
            student_data = {}
            for r in rows:
                sid = r['student_id']
                if sid not in student_data:
                    student_data[sid] = {
                        'student_id': sid,
                        'name': r['name'],
                        'class_id': r['class_id'],
                        'scores': [],
                    }
                student_data[sid]['scores'].append(float(r['score']))

            # 归一化因子：语数英0-150→0-100，物化政0-100→0-100
            max_score = 150 if subject in SUBJECTS_LANG else 100
            norm_factor = 100.0 / max_score

            # 计算每个学生的能力值，用于班级百分位
            class_abilities = {}
            for sid, data in student_data.items():
                scores = data['scores']
                normalized = [s * norm_factor for s in scores]
                ability = sum(normalized) / len(normalized) if normalized else 0
                cid = data['class_id']
                if cid not in class_abilities:
                    class_abilities[cid] = []
                class_abilities[cid].append(ability)

            # 计算每个班级的百分位阈值
            class_thresholds = {}
            for cid, abilities in class_abilities.items():
                abilities.sort()
                n = len(abilities)
                class_thresholds[cid] = {
                    'p25': abilities[int(n * 0.25)] if n > 0 else 0,
                    'p50': abilities[int(n * 0.50)] if n > 0 else 0,
                    'p75': abilities[int(n * 0.75)] if n > 0 else 0,
                    'mean': sum(abilities) / n if n > 0 else 0,
                }

            # 分析每个学生
            analysis_results = []
            for sid, data in student_data.items():
                scores = data['scores']
                if len(scores) < 2:
                    continue

                normalized = [s * norm_factor for s in scores]
                ability = sum(normalized) / len(normalized)

                # 趋势 (线性回归)
                x = list(range(1, len(scores) + 1))
                y = normalized
                slope, _intercept = _simple_linear_regression(x, y)

                # 波动 (标准差 / 均值 = 变异系数)
                avg = ability
                variance = sum((s - avg) ** 2 for s in normalized) / len(normalized)
                std = variance ** 0.5
                volatility = std / avg if avg > 0 else 0

                # 分类
                cid = data['class_id']
                thresholds = class_thresholds.get(cid, {})
                classification, description, attention_level = _classify_student(
                    ability, slope, volatility, thresholds
                )

                raw_scores = [round(s, 1) for s in scores]
                analysis_results.append({
                    'student_id': sid,
                    'name': data['name'],
                    'class_id': cid,
                    'ability': round(ability, 1),
                    'trend': round(slope, 2),
                    'volatility': round(volatility, 3),
                    'classification': classification,
                    'description': description,
                    'attention_level': attention_level,
                    'avg_raw_score': round(sum(scores) / len(scores), 1),
                    'scores': raw_scores,
                })

            # 按注意力级别排序
            attention_order = {'high': 0, 'medium': 1, 'low': 2}
            analysis_results.sort(key=lambda x: (
                attention_order.get(x['attention_level'], 3), -x['ability']
            ))

            # 按班级分组
            class_results = []
            for c in teacher_classes:
                cid = c['class_id']
                students = [a for a in analysis_results if a['class_id'] == cid]
                class_results.append({
                    'class_id': cid,
                    'class_name': c['class_name'],
                    'students': students,
                    'thresholds': {
                        'p25': round(class_thresholds.get(cid, {}).get('p25', 0), 1),
                        'p50': round(class_thresholds.get(cid, {}).get('p50', 0), 1),
                        'p75': round(class_thresholds.get(cid, {}).get('p75', 0), 1),
                        'mean': round(class_thresholds.get(cid, {}).get('mean', 0), 1),
                    },
                })

            summary_counts = {}
            for c in analysis_results:
                label = c['classification']
                summary_counts[label] = summary_counts.get(label, 0) + 1

            current_app.logger.info(
                f"[SERVICE] get_student_analysis: {len(analysis_results)} students, "
                f"subject={subject}, summary={summary_counts}")
            return {
                'subject': subject,
                'classes': class_results,
                'summary': {
                    'total_students': len(analysis_results),
                    'gifted': summary_counts.get('天才型', 0),
                    'potential': summary_counts.get('潜力型', 0),
                    'motivated': summary_counts.get('上进型', 0),
                    'declining': summary_counts.get('下滑型', 0),
                    'giving_up': summary_counts.get('摆烂型', 0),
                },
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_student_analysis failed: {str(e)}")
        return None


def get_student_trajectory(student_id, subject):
    """获取单个学生在某科目的历次考试轨迹(含班级和年级平均分对比)"""
    current_app.logger.debug(f"[SERVICE] get_student_trajectory: student_id={student_id}, subject={subject}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 获取学生信息
            cursor.execute(
                "SELECT student_id, name, class_id FROM students WHERE student_id = %s",
                (student_id,)
            )
            student = cursor.fetchone()
            if not student:
                current_app.logger.warning(f"[SERVICE] get_student_trajectory: student_id={student_id} not found")
                return None

            # 获取学生历次考试成绩
            cursor.execute("""
                SELECT type, score, exam_date
                FROM scores
                WHERE student_id = %s AND subject = %s
                ORDER BY FIELD(type, 'monthly1', 'monthly2', 'midterm', 'final')
            """, (student_id, subject))
            student_scores = cursor.fetchall()
            if not student_scores:
                current_app.logger.info(
                    f"[SERVICE] get_student_trajectory: no scores for student_id={student_id}, subject={subject}")
                return None

            # 获取班级平均分
            cursor.execute("""
                SELECT sc.type, AVG(sc.score) as avg_score
                FROM scores sc
                JOIN students s ON sc.student_id = s.student_id
                WHERE s.class_id = %s AND sc.subject = %s
                GROUP BY sc.type
                ORDER BY FIELD(sc.type, 'monthly1', 'monthly2', 'midterm', 'final')
            """, (student['class_id'], subject))
            class_avgs = {r['type']: float(r['avg_score']) for r in cursor.fetchall()}

            # 获取年级平均分
            cursor.execute("""
                SELECT type, AVG(score) as avg_score
                FROM scores
                WHERE subject = %s
                GROUP BY type
                ORDER BY FIELD(type, 'monthly1', 'monthly2', 'midterm', 'final')
            """, (subject,))
            grade_avgs = {r['type']: float(r['avg_score']) for r in cursor.fetchall()}

            trajectory = []
            for s in student_scores:
                trajectory.append({
                    'type': s['type'],
                    'exam_date': str(s['exam_date']),
                    'score': float(s['score']),
                    'class_avg': round(class_avgs.get(s['type'], 0), 1),
                    'grade_avg': round(grade_avgs.get(s['type'], 0), 1),
                })

            current_app.logger.info(
                f"[SERVICE] get_student_trajectory: {len(trajectory)} exams for {student['name']}")
            return {
                'student_id': student['student_id'],
                'name': student['name'],
                'class_id': student['class_id'],
                'subject': subject,
                'trajectory': trajectory,
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_student_trajectory failed: {str(e)}")
        return None
