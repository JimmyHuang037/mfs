import pandas as pd
import statistics as stats_mod

from flask import current_app
from app.utility.db_connection import get_db_connection

# 赋分结果缓存：key=(exam_type, exam_date) -> {student_id: {subject: assigned_score}}
# 最多缓存 100 条，超过时淘汰最旧条目
_assigned_score_cache = {}
_MAX_CACHE_SIZE = 100


def clear_assigned_cache():
    """清空赋分缓存（xlsx 导入后调用）"""
    _assigned_score_cache.clear()
    current_app.logger.info("[CACHE] assigned_score_cache cleared")


def _cache_get(exam_type, exam_date):
    return _assigned_score_cache.get((exam_type, exam_date))


def _cache_set(exam_type, exam_date, value):
    if len(_assigned_score_cache) >= _MAX_CACHE_SIZE:
        # 淘汰最旧的条目
        oldest_key = next(iter(_assigned_score_cache))
        del _assigned_score_cache[oldest_key]
    _assigned_score_cache[(exam_type, exam_date)] = value

SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '政治']
SUBJECTS_LANG = ['语文', '数学', '英语']       # 原始分 0-150，直接计入总分
SUBJECTS_SCI = ['物理', '化学', '政治']         # 原始分 0-100，按年级百分位赋分(40-70)
EXAM_TYPE_ORDER = ['monthly1', 'monthly2', 'midterm', 'final']
VALID_EXAM_TYPES = {'monthly1', 'monthly2', 'midterm', 'final'}
EXAM_TYPE_CN_MAP = {
    '月考1': 'monthly1', '月考一': 'monthly1',
    '月考2': 'monthly2', '月考二': 'monthly2',
    '期中': 'midterm', '期中考试': 'midterm',
    '期末': 'final', '期末考试': 'final',
}
XLSX_COLUMN_MAP = {
    '学号': 'student_id',
    '科目': 'subject',
    '类型': 'type',
    '分数': 'score',
}
# 总分满分660 = 语数英(150×3) + 物化政赋分(70×3)
SEGMENTS = [(0, 109), (110, 219), (220, 329), (330, 439), (440, 549), (550, 660)]

# 赋分对照表：(百分位上限, 等级, 赋分值)
ASSIGNMENT_TABLE = [
    (0.05, 'A+', 70),
    (0.15, 'A+', 67),
    (0.25, 'B+', 64),
    (0.35, 'B',  61),
    (0.45, 'B-', 58),
    (0.55, 'C+', 55),
    (0.65, 'C',  52),
    (0.75, 'C-', 49),
    (0.85, 'D+', 46),
    (0.95, 'D',  43),
    (1.00, 'E',  40),
]


def compute_assigned_scores(exam_type, exam_date):
    """计算某次考试中所有学生的物化政赋分。
    返回 dict: {student_id: {subject: assigned_score}}"""
    # 命中缓存则直接返回
    cached = _cache_get(exam_type, exam_date)
    if cached is not None:
        current_app.logger.debug(f"[CACHE] hit assigned_scores: type={exam_type}, date={exam_date}")
        return cached

    current_app.logger.debug(f"[SERVICE] compute_assigned_scores: type={exam_type}, date={exam_date}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            result = {}
            for subj in SUBJECTS_SCI:
                cursor.execute("""
                    SELECT student_id, score FROM scores
                    WHERE type = %s AND exam_date = %s AND subject = %s
                    ORDER BY score DESC
                """, (exam_type, exam_date, subj))
                rows = cursor.fetchall()
                total = len(rows)
                if total == 0:
                    continue
                for rank_idx, row in enumerate(rows):
                    sid = row['student_id']
                    ratio = (rank_idx + 1) / total
                    assigned = 40  # default E
                    for threshold, _level, score_val in ASSIGNMENT_TABLE:
                        if ratio <= threshold:
                            assigned = score_val
                            break
                    if sid not in result:
                        result[sid] = {}
                    result[sid][subj] = assigned
            _cache_set(exam_type, exam_date, result)
            current_app.logger.info(f"[SERVICE] compute_assigned_scores: {len(result)} students")
            return result
    except Exception as e:
        current_app.logger.error(
            f"[DB_ERROR] compute_assigned_scores failed: type={exam_type}, date={exam_date}, err={str(e)}"
        )
        raise


def compute_total_score(student_raw_scores, assigned_scores_map):
    """计算一个学生的总分：语数英原始分 + 物化政赋分。
    student_raw_scores: {subject: raw_score}
    assigned_scores_map: {subject: assigned_score} (仅物化政)
    """
    total = 0.0
    for subj in SUBJECTS_LANG:
        total += student_raw_scores.get(subj, 0)
    for subj in SUBJECTS_SCI:
        total += assigned_scores_map.get(subj, 40)
    return round(total, 1)


def get_scores(student_id):
    current_app.logger.debug(f"[SERVICE] get_scores called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT id, student_id, subject, type, score, exam_date FROM scores WHERE student_id = %s",
                (student_id,))
            scores = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_scores: returned {len(scores)} scores for student_id={student_id}")
            return scores
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_scores failed: {str(e)}")
        return None


def get_all_scores():
    current_app.logger.debug("[SERVICE] get_all_scores called")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, student_id, subject, type, score, exam_date FROM scores")
            scores = cursor.fetchall()
            current_app.logger.info(f"[SERVICE] get_all_scores: returned {len(scores)} scores")
            return scores
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_all_scores failed: {str(e)}")
        return None


def add_score(student_id, subject, score_type, score_value):
    current_app.logger.debug(
        f"[SERVICE] add_score called: student_id={student_id}, subject={subject}, type={score_type}, score={score_value}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO scores (student_id, subject, type, score, exam_date) VALUES (%s, %s, %s, %s, CURDATE())",
                (student_id, subject, score_type, score_value)
            )
            conn.commit()
            lastrowid = cursor.lastrowid
            clear_assigned_cache()
            current_app.logger.info(f"[DB] INSERT score id={lastrowid} student_id={student_id} subject={subject}")
            return lastrowid
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] add_score failed: {str(e)}")
        return None


def update_score(score_id, subject=None, score_type=None, score_value=None):
    current_app.logger.debug(f"[SERVICE] update_score called: score_id={score_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute("SELECT id, student_id FROM scores WHERE id = %s", (score_id,))
            if not cursor.fetchone():
                current_app.logger.warning(f"[SERVICE] update_score: score_id={score_id} not found")
                return False

            update_fields = []
            values = []
            if subject is not None:
                update_fields.append("subject = %s")
                values.append(subject)
            if score_type is not None:
                update_fields.append("type = %s")
                values.append(score_type)
            if score_value is not None:
                update_fields.append("score = %s")
                values.append(score_value)

            if not update_fields:
                current_app.logger.warning("[SERVICE] update_score: no fields to update")
                return False

            values.append(score_id)
            update_query = f"UPDATE scores SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(update_query, tuple(values))
            conn.commit()
            updated = cursor.rowcount > 0
            if updated:
                clear_assigned_cache()
            current_app.logger.info(f"[DB] UPDATE score id={score_id}, affected={updated}")
            return updated
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] update_score failed: {str(e)}")
        return False


def delete_score(score_id):
    current_app.logger.debug(f"[SERVICE] delete_score called: score_id={score_id}")
    try:
        with get_db_connection() as conn, conn.cursor() as cursor:
            cursor.execute("SELECT id FROM scores WHERE id = %s", (score_id,))
            if not cursor.fetchone():
                current_app.logger.warning(f"[SERVICE] delete_score: score_id={score_id} not found")
                return False

            cursor.execute("DELETE FROM scores WHERE id = %s", (score_id,))
            conn.commit()
            deleted = cursor.rowcount > 0
            if deleted:
                clear_assigned_cache()
            current_app.logger.info(f"[DB] DELETE score id={score_id}, affected={deleted}")
            return deleted
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] delete_score failed: {str(e)}")
        return False


# ============================================================
# 学生成绩查询系统 — 统计分析接口
# ============================================================

def get_exam_types(student_id):
    """获取学生可用的考试类型及最近一次考试日期"""
    current_app.logger.debug(f"[SERVICE] get_exam_types called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT type, MAX(exam_date) AS latest_date
                FROM scores
                WHERE student_id = %s
                GROUP BY type
                ORDER BY FIELD(type, 'monthly1', 'monthly2', 'midterm', 'final')
            """, (student_id,))
            rows = cursor.fetchall()
            label_map = {'monthly1': '月考1', 'monthly2': '月考2', 'midterm': '期中', 'final': '期末'}
            result = []
            for r in rows:
                result.append({
                    'type': r['type'],
                    'latest_date': r['latest_date'].isoformat() if r['latest_date'] else None,
                    'label': label_map.get(r['type'], r['type']),
                })
            current_app.logger.info(f"[SERVICE] get_exam_types: {len(result)} types for student_id={student_id}")
            return result
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_exam_types failed: {str(e)}")
        return None


def _compute_level(rank, total):
    """根据百分位计算等级 A/B/C/D/E"""
    if total == 0:
        return 'E'
    ratio = rank / total
    if ratio <= 0.10:
        return 'A'
    elif ratio <= 0.40:
        return 'B'
    elif ratio <= 0.60:
        return 'C'
    elif ratio <= 0.90:
        return 'D'
    else:
        return 'E'


def get_score_overview(student_id, exam_type, exam_date):
    """获取成绩总览：总分(语数英原始+物化政赋分)、班级排名、年级排名、等级"""
    current_app.logger.debug(f"[SERVICE] get_score_overview: student_id={student_id}, type={exam_type}, date={exam_date}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 1. 获取所有学生的原始分
            cursor.execute("""
                SELECT s.student_id, s.class_id, sc.subject, sc.score
                FROM scores sc
                JOIN students s ON sc.student_id = s.student_id
                WHERE sc.type = %s AND sc.exam_date = %s
            """, (exam_type, exam_date))
            all_rows = cursor.fetchall()

            # 按学生分组原始分
            raw_by_student = {}
            class_by_student = {}
            for r in all_rows:
                sid = r['student_id']
                if sid not in raw_by_student:
                    raw_by_student[sid] = {}
                raw_by_student[sid][r['subject']] = float(r['score'])
                class_by_student[sid] = r['class_id']

            # 2. 计算赋分
            assigned_map = compute_assigned_scores(exam_type, exam_date)

            # 3. 计算每个学生的总分（语数英原始 + 物化政赋分）
            totals = []
            for sid, raw_scores in raw_by_student.items():
                assigned = assigned_map.get(sid, {})
                total = compute_total_score(raw_scores, assigned)
                totals.append((sid, total, class_by_student.get(sid)))

            # 4. 学生班级
            cursor.execute("SELECT class_id FROM students WHERE student_id = %s", (student_id,))
            student_row = cursor.fetchone()
            class_id = student_row['class_id'] if student_row else None

            # 5. 年级排名
            totals.sort(key=lambda x: x[1], reverse=True)
            grade_total = len(totals)
            grade_rank = None
            student_total = 0
            for i, (sid, total, _) in enumerate(totals):
                if sid == student_id:
                    grade_rank = i + 1
                    student_total = total
                    break

            # 6. 班级排名
            class_rank = None
            class_total = 0
            if class_id:
                class_totals = [(sid, t) for sid, t, cid in totals if cid == class_id]
                class_total = len(class_totals)
                for i, (sid, t) in enumerate(class_totals):
                    if sid == student_id:
                        class_rank = i + 1
                        break

            level = _compute_level(grade_rank, grade_total) if grade_rank else 'E'

            current_app.logger.info(
                f"[SERVICE] get_score_overview: total={student_total}, "
                f"class_rank={class_rank}/{class_total}, grade_rank={grade_rank}/{grade_total}, level={level}")
            return {
                'total_score': student_total,
                'class_rank': class_rank,
                'class_total': class_total,
                'grade_rank': grade_rank,
                'grade_total': grade_total,
                'level': level,
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_score_overview failed: {str(e)}")
        return None


def get_score_details(student_id, exam_type, exam_date):
    """获取成绩明细：各科原始分 + 物化政赋分 + 班级/年级平均分(原始分)"""
    current_app.logger.debug(f"[SERVICE] get_score_details: student_id={student_id}, type={exam_type}, date={exam_date}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 1. 获取学生班级
            cursor.execute("SELECT class_id FROM students WHERE student_id = %s", (student_id,))
            student_row = cursor.fetchone()
            class_id = student_row['class_id'] if student_row else None

            # 2. 获取学生各科原始分
            cursor.execute("""
                SELECT subject, score FROM scores
                WHERE student_id = %s AND type = %s AND exam_date = %s
            """, (student_id, exam_type, exam_date))
            student_raw = {r['subject']: float(r['score']) for r in cursor.fetchall()}

            # 3. 获取该学生的物化政赋分
            assigned_map = compute_assigned_scores(exam_type, exam_date)
            student_assigned = assigned_map.get(student_id, {})

            # 4. 班级平均分(原始分)
            class_raw_avgs = {}
            if class_id:
                cursor.execute("""
                    SELECT subject, AVG(score) AS avg_score
                    FROM scores
                    WHERE student_id IN (SELECT student_id FROM students WHERE class_id = %s)
                      AND type = %s AND exam_date = %s
                    GROUP BY subject
                """, (class_id, exam_type, exam_date))
                for r in cursor.fetchall():
                    class_raw_avgs[r['subject']] = round(float(r['avg_score']), 1)

            # 5. 年级平均分(原始分)
            cursor.execute("""
                SELECT subject, AVG(score) AS avg_score
                FROM scores
                WHERE type = %s AND exam_date = %s
                GROUP BY subject
            """, (exam_type, exam_date))
            grade_raw_avgs = {r['subject']: round(float(r['avg_score']), 1) for r in cursor.fetchall()}

            # 6. 物化政赋分后平均分（班级+年级）
            class_assigned_avgs = {}
            grade_assigned_avgs = {}
            # 先查出班级学生列表（循环外，避免重复查询）
            class_sids = set()
            if class_id and assigned_map:
                c2 = conn.cursor(dictionary=True)
                c2.execute("SELECT student_id FROM students WHERE class_id = %s", (class_id,))
                class_sids = {r['student_id'] for r in c2.fetchall()}
                c2.close()
            if assigned_map:
                for subj in SUBJECTS_SCI:
                    # 年级赋分平均
                    all_assigned = [v.get(subj) for v in assigned_map.values() if subj in v]
                    if all_assigned:
                        grade_assigned_avgs[subj] = round(sum(all_assigned) / len(all_assigned), 1)
                    # 班级赋分平均（使用已缓存的 class_sids）
                    if class_id:
                        class_assigned = [assigned_map[sid].get(subj) for sid in class_sids if sid in assigned_map and subj in assigned_map[sid]]
                        if class_assigned:
                            class_assigned_avgs[subj] = round(sum(class_assigned) / len(class_assigned), 1)

            subjects = []
            for subj in SUBJECTS:
                entry = {
                    'subject': subj,
                    'raw_score': student_raw.get(subj),
                    'class_avg_raw': class_raw_avgs.get(subj),
                    'grade_avg_raw': grade_raw_avgs.get(subj),
                }
                if subj in SUBJECTS_SCI:
                    entry['assigned_score'] = student_assigned.get(subj)
                    entry['class_avg_assigned'] = class_assigned_avgs.get(subj)
                    entry['grade_avg_assigned'] = grade_assigned_avgs.get(subj)
                subjects.append(entry)

            current_app.logger.info(f"[SERVICE] get_score_details: returned {len(subjects)} subjects")
            return {'subjects': subjects}
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_score_details failed: {str(e)}")
        return None


def get_segment_stats(exam_type, exam_date, dimension, class_id=None, student_id=None):
    """获取分数段统计（直方图数据），基于赋分后总分"""
    current_app.logger.debug(
        f"[SERVICE] get_segment_stats: type={exam_type}, date={exam_date}, dimension={dimension}, class_id={class_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 1. 获取所有学生原始分
            if dimension == 'class' and class_id:
                cursor.execute("""
                    SELECT s.student_id, sc.subject, sc.score
                    FROM scores sc
                    JOIN students s ON sc.student_id = s.student_id
                    WHERE sc.type = %s AND sc.exam_date = %s AND s.class_id = %s
                """, (exam_type, exam_date, class_id))
            else:
                cursor.execute("""
                    SELECT s.student_id, sc.subject, sc.score
                    FROM scores sc
                    JOIN students s ON sc.student_id = s.student_id
                    WHERE sc.type = %s AND sc.exam_date = %s
                """, (exam_type, exam_date))
            all_rows = cursor.fetchall()

            # 按学生分组
            raw_by_student = {}
            for r in all_rows:
                sid = r['student_id']
                if sid not in raw_by_student:
                    raw_by_student[sid] = {}
                raw_by_student[sid][r['subject']] = float(r['score'])

            # 2. 计算赋分和总分
            assigned_map = compute_assigned_scores(exam_type, exam_date)
            totals = []
            for sid, raw_scores in raw_by_student.items():
                assigned = assigned_map.get(sid, {})
                total = compute_total_score(raw_scores, assigned)
                totals.append((sid, total))

            total_students = len(totals)
            if total_students == 0:
                return {'segments': [], 'total_students': 0}

            # 3. 获取目标学生总分
            student_total = None
            if student_id:
                for sid, t in totals:
                    if sid == student_id:
                        student_total = t
                        break

            # 4. 分段统计
            score_values = [t for _, t in totals]
            segments = []
            student_segment_label = None
            for i, (lo, hi) in enumerate(SEGMENTS):
                if i < len(SEGMENTS) - 1:
                    count = sum(1 for t in score_values if lo <= t < hi)
                    is_student = student_total is not None and lo <= student_total < hi
                else:
                    count = sum(1 for t in score_values if lo <= t <= hi)
                    is_student = student_total is not None and lo <= student_total <= hi
                pct = round(count / total_students * 100, 1) if total_students > 0 else 0
                label = f'{lo}-{hi}'
                if is_student:
                    student_segment_label = label
                segments.append({
                    'range': label,
                    'count': count,
                    'percentage': pct,
                    'is_student_segment': is_student,
                })

            current_app.logger.info(f"[SERVICE] get_segment_stats: {len(segments)} segments, {total_students} students")
            return {
                'segments': segments,
                'total_students': total_students,
                'student_total': student_total,
                'student_segment': student_segment_label,
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_segment_stats failed: {str(e)}")
        return None


def get_top_students(exam_type, exam_date):
    """获取单科年级前三(原始分) + 总分年级前十(赋分后)"""
    current_app.logger.debug(f"[SERVICE] get_top_students: type={exam_type}, date={exam_date}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 1. 单科前三（原始分排名）
            subject_tops = {}
            for subj in SUBJECTS:
                cursor.execute("""
                    SELECT sc.student_id, s.name, sc.score
                    FROM scores sc
                    JOIN students s ON sc.student_id = s.student_id
                    WHERE sc.type = %s AND sc.exam_date = %s AND sc.subject = %s
                    ORDER BY sc.score DESC
                    LIMIT 3
                """, (exam_type, exam_date, subj))
                rows = cursor.fetchall()
                subject_tops[subj] = [
                    {'rank': i + 1, 'student_id': r['student_id'], 'name': r['name'], 'score': float(r['score'])}
                    for i, r in enumerate(rows)
                ]

            # 2. 总分年级前十（赋分后总分）
            cursor.execute("""
                SELECT s.student_id, s.name, sc.subject, sc.score
                FROM scores sc
                JOIN students s ON sc.student_id = s.student_id
                WHERE sc.type = %s AND sc.exam_date = %s
            """, (exam_type, exam_date))
            all_rows = cursor.fetchall()

            raw_by_student = {}
            names = {}
            for r in all_rows:
                sid = r['student_id']
                if sid not in raw_by_student:
                    raw_by_student[sid] = {}
                raw_by_student[sid][r['subject']] = float(r['score'])
                names[sid] = r['name']

            assigned_map = compute_assigned_scores(exam_type, exam_date)
            totals = []
            for sid, raw_scores in raw_by_student.items():
                assigned = assigned_map.get(sid, {})
                total = compute_total_score(raw_scores, assigned)
                totals.append((sid, total))
            totals.sort(key=lambda x: x[1], reverse=True)

            overall_top10 = [
                {'rank': i + 1, 'student_id': sid, 'name': names.get(sid, ''), 'total': round(t, 1)}
                for i, (sid, t) in enumerate(totals[:10])
            ]

            current_app.logger.info(f"[SERVICE] get_top_students: {len(overall_top10)} overall, 6 subject tops")
            return {
                'subject_tops': subject_tops,
                'overall_top10': overall_top10,
            }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_top_students failed: {str(e)}")
        return None


def import_scores_xlsx(file):
    """从 xlsx 文件批量导入成绩。表头固定4列：学号、科目、类型、分数（不限顺序）。
    学号不存在或非0.5倍数的行跳过。返回 {success, failed, errors}。"""
    current_app.logger.info("[SERVICE] import_scores_xlsx called")
    try:
        df = pd.read_excel(file)
        current_app.logger.info(f"[SERVICE] import_scores_xlsx: read {len(df)} rows from xlsx")

        # 映射中文列名到英文字段名
        rename_map = {}
        for col in df.columns:
            col_stripped = str(col).strip()
            if col_stripped in XLSX_COLUMN_MAP:
                rename_map[col] = XLSX_COLUMN_MAP[col_stripped]
        df = df.rename(columns=rename_map)

        required_cols = {'student_id', 'subject', 'type', 'score'}
        missing = required_cols - set(df.columns)
        if missing:
            current_app.logger.warning(f"[SERVICE] import_scores_xlsx: missing columns {missing}")
            return {'success': 0, 'failed': len(df), 'errors': [f'缺少列: {missing}']}

        success_count = 0
        failed_count = 0
        errors = []

        with get_db_connection() as conn, conn.cursor() as cursor:
            for idx, row in df.iterrows():
                student_id = str(row['student_id']).strip() if pd.notna(row['student_id']) else ''
                subject = str(row['subject']).strip() if pd.notna(row['subject']) else ''
                score_type = str(row['type']).strip() if pd.notna(row['type']) else ''
                score_value = row['score']

                # 基本校验
                if not student_id or not subject or not score_type:
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 缺少必填字段')
                    continue

                # 分数校验
                try:
                    score_value = float(score_value)
                except (ValueError, TypeError):
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 分数无效 ({row["score"]})')
                    continue

                max_score = 150 if subject in SUBJECTS_LANG else 100
                if score_value < 0 or score_value > max_score:
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 分数超范围 ({score_value}, {subject}满分{max_score})')
                    continue

                # 检查是否为 0.5 倍数
                if round(score_value * 2) != score_value * 2:
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 分数非0.5倍数 ({score_value})')
                    continue

                # 考试类型：先尝试中文映射
                if score_type in EXAM_TYPE_CN_MAP:
                    score_type = EXAM_TYPE_CN_MAP[score_type]
                if score_type not in VALID_EXAM_TYPES:
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 无效考试类型 ({score_type})')
                    continue

                # 检查学号是否存在
                cursor.execute("SELECT student_id FROM students WHERE student_id = %s", (student_id,))
                if not cursor.fetchone():
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 学号不存在 ({student_id})')
                    continue

                # 查重：同学生+科目+类型+日期 → 替换
                try:
                    cursor.execute(
                        "SELECT id FROM scores WHERE student_id = %s AND subject = %s AND type = %s AND exam_date = CURDATE()",
                        (student_id, subject, score_type)
                    )
                    existing = cursor.fetchone()
                    if existing:
                        cursor.execute(
                            "UPDATE scores SET score = %s WHERE id = %s",
                            (score_value, existing[0])
                        )
                        current_app.logger.debug(f"[DB] UPDATE score id={existing[0]} (xlsx replace)")
                    else:
                        cursor.execute(
                            "INSERT INTO scores (student_id, subject, type, score, exam_date) VALUES (%s, %s, %s, %s, CURDATE())",
                            (student_id, subject, score_type, score_value)
                        )
                        current_app.logger.debug(f"[DB] INSERT score (xlsx new)")
                    success_count += 1
                except Exception as insert_err:
                    failed_count += 1
                    errors.append(f'行{idx + 2}: 写入失败 ({str(insert_err)})')
                    current_app.logger.error(f"[DB_ERROR] import row {idx + 2} failed: {str(insert_err)}")

            conn.commit()

        if success_count > 0:
            clear_assigned_cache()

        if errors:
            for err in errors[:10]:
                current_app.logger.warning(f"[SERVICE] import_scores_xlsx error: {err}")
        current_app.logger.info(
            f"[SERVICE] import_scores_xlsx: success={success_count}, failed={failed_count}")
        return {
            'success': success_count,
            'failed': failed_count,
            'errors': errors[:50],  # 最多返回50条错误
        }
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] import_scores_xlsx failed: {str(e)}")
        return {'success': 0, 'failed': 0, 'errors': [str(e)]}


# ============================================================
# 学习建议 — 趋势分析 + 百分位 + 文案生成
# ============================================================

def get_learning_advice(student_id):
    """生成学习建议：各科分数趋势、排名趋势、百分位雷达图、温和建议文案。"""
    current_app.logger.debug(f"[SERVICE] get_learning_advice called: student_id={student_id}")
    try:
        with get_db_connection() as conn, conn.cursor(dictionary=True) as cursor:
            # 1. 获取所有考试（按时间排序）
            cursor.execute("""
                SELECT DISTINCT type, exam_date FROM scores
                WHERE student_id = %s
                ORDER BY exam_date ASC
            """, (student_id,))
            exams = cursor.fetchall()
            if not exams:
                current_app.logger.warning(f"[SERVICE] get_learning_advice: no exams for {student_id}")
                return None

            exam_labels = []
            for e in exams:
                label_map = {'monthly1': '月考1', 'monthly2': '月考2', 'midterm': '期中', 'final': '期末'}
                exam_labels.append(label_map.get(e['type'], e['type']))

            # 2. 获取该学生所有成绩
            cursor.execute("""
                SELECT subject, type, exam_date, score FROM scores
                WHERE student_id = %s ORDER BY exam_date ASC
            """, (student_id,))
            raw_rows = cursor.fetchall()

            # 按考试分组原始分
            scores_by_exam = {}
            for r in raw_rows:
                key = (r['type'], str(r['exam_date']))
                if key not in scores_by_exam:
                    scores_by_exam[key] = {}
                scores_by_exam[key][r['subject']] = float(r['score'])

            # 3. 每次考试的赋分和总分排名
            assigned_by_exam = {}
            rank_by_exam = {}
            total_by_exam = {}
            for e in exams:
                etype, edate = e['type'], str(e['exam_date'])
                key = (etype, edate)
                assigned_map = compute_assigned_scores(etype, edate)
                assigned_by_exam[key] = assigned_map

                # 计算所有学生总分并排名
                cursor.execute("""
                    SELECT s.student_id, sc.subject, sc.score
                    FROM scores sc JOIN students s ON sc.student_id = s.student_id
                    WHERE sc.type = %s AND sc.exam_date = %s
                """, (etype, edate))
                all_rows = cursor.fetchall()
                raw_by_stu = {}
                for ar in all_rows:
                    sid = ar['student_id']
                    if sid not in raw_by_stu:
                        raw_by_stu[sid] = {}
                    raw_by_stu[sid][ar['subject']] = float(ar['score'])

                totals = []
                for sid, rs in raw_by_stu.items():
                    a = assigned_map.get(sid, {})
                    t = compute_total_score(rs, a)
                    totals.append((sid, t))
                totals.sort(key=lambda x: x[1], reverse=True)
                total_count = len(totals)
                for i, (sid, t) in enumerate(totals):
                    if sid == student_id:
                        rank_by_exam[key] = {'rank': i + 1, 'total': total_count}
                        total_by_exam[key] = t
                        break

            # 4. 构建各科分数趋势（原始分）
            subject_trends = {}
            for subj in SUBJECTS:
                trend = []
                for e in exams:
                    key = (e['type'], str(e['exam_date']))
                    raw = scores_by_exam.get(key, {}).get(subj)
                    trend.append(raw)
                subject_trends[subj] = trend

            # 5. 总排名趋势
            rank_trend = []
            total_trend = []
            for e in exams:
                key = (e['type'], str(e['exam_date']))
                r = rank_by_exam.get(key)
                rank_trend.append(r['rank'] if r else None)
                total_trend.append(total_by_exam.get(key))

            # 6. 最近一次考试的各科百分位（用于雷达图）
            last_key = (exams[-1]['type'], str(exams[-1]['exam_date']))
            last_assigned = assigned_by_exam.get(last_key, {})
            student_last_assigned = last_assigned.get(student_id, {})
            last_raw = scores_by_exam.get(last_key, {})

            percentiles = {}
            for subj in SUBJECTS_SCI:
                # 物化政用赋分值算百分位
                all_vals = sorted([v.get(subj, 40) for v in last_assigned.values()], reverse=True)
                stu_val = student_last_assigned.get(subj, 40)
                rank_pos = sum(1 for v in all_vals if v > stu_val) + 1
                pct = round((1 - rank_pos / len(all_vals)) * 100, 1) if all_vals else 0
                percentiles[subj] = max(0, pct)
            for subj in SUBJECTS_LANG:
                # 语数英用原始分算百分位
                cursor.execute("""
                    SELECT score FROM scores WHERE type=%s AND exam_date=%s AND subject=%s
                    ORDER BY score DESC
                """, (exams[-1]['type'], exams[-1]['exam_date'], subj))
                all_scores = [float(r['score']) for r in cursor.fetchall()]
                stu_score = last_raw.get(subj, 0)
                rank_pos = sum(1 for s in all_scores if s > stu_score) + 1
                pct = round((1 - rank_pos / len(all_scores)) * 100, 1) if all_scores else 0
                percentiles[subj] = max(0, pct)

            # 7. 生成建议文案（传入最近一次原始分和赋分用于ROI分析）
            advice_list = _generate_advice_text(
                subject_trends, percentiles, rank_trend, exam_labels,
                last_raw, student_last_assigned
            )

            result = {
                'exam_labels': exam_labels,
                'subject_trends': subject_trends,
                'rank_trend': rank_trend,
                'total_trend': total_trend,
                'percentiles': percentiles,
                'advice': advice_list,
            }
            current_app.logger.info(f"[SERVICE] get_learning_advice: generated for {student_id}, {len(advice_list)} advice items")
            return result
    except Exception as e:
        current_app.logger.error(f"[DB_ERROR] get_learning_advice failed: {str(e)}")
        return None


def _get_roi_tier(subj, raw_score):
    """根据科目和原始分判断ROI区间。返回 (tier, tier_label)。
    tier: 'low'=低分段大空间, 'mid'=中分段稳步, 'high'=高分段保持
    """
    if subj == '语文':
        if raw_score < 90:
            return 'low', f'{raw_score}分'
        elif raw_score <= 110:
            return 'mid', f'{raw_score}分'
        else:
            return 'high', f'{raw_score}分'
    elif subj in ('数学', '英语'):
        if raw_score < 90:
            return 'low', f'{raw_score}分'
        elif raw_score <= 120:
            return 'mid', f'{raw_score}分'
        else:
            return 'high', f'{raw_score}分'
    else:  # 物化政
        if raw_score < 50:
            return 'low', f'{raw_score}分'
        elif raw_score <= 75:
            return 'mid', f'{raw_score}分'
        else:
            return 'high', f'{raw_score}分'


def _generate_advice_text(subject_trends, percentiles, rank_trend, exam_labels,
                          last_raw, last_assigned):
    """Step1: 基于提分ROI + 主科权重的学习建议引擎。"""
    advice = []

    def _add(text, subject=None):
        """Helper to append structured advice item."""
        advice.append({'subject': subject, 'text': text, 'is_summary': False})

    # ── 1. 各科ROI分析（按科目顺序） ──
    for subj in SUBJECTS:
        raw = last_raw.get(subj)
        if raw is None:
            continue

        tier, score_label = _get_roi_tier(subj, raw)

        if subj in SUBJECTS_LANG:
            if tier == 'low':
                _add(f'目前{score_label}，仍有较大的短期提升空间，通过专题训练和基础巩固，有机会在较短时间内取得明显进步。', subj)
            elif tier == 'mid':
                _add(f'目前{score_label}，处于中等水平，通过针对性练习和错题回顾，仍有稳步提升的空间。', subj)
            else:
                _add(f'已处于较高水平（{score_label}），继续提升需要更多时间投入，建议以保持稳定为主。', subj)
        else:  # 物化政
            assigned = last_assigned.get(subj)
            assigned_label = f'（赋分{assigned}）' if assigned is not None else ''
            if tier == 'low':
                _add(f'目前原始分{score_label}{assigned_label}，基础部分有较大提升空间，建议优先掌握核心知识点和常考题型。', subj)
            elif tier == 'mid':
                _add(f'目前原始分{score_label}{assigned_label}，有一定基础，可通过专项突破进一步提高。', subj)
            else:
                _add(f'原始分{score_label}{assigned_label}，已处于较好水平，建议维持当前节奏，避免过度投入导致其他科目下滑。', subj)

    # ── 2. 木桶短板分析 ──
    sorted_pcts = sorted(percentiles.items(), key=lambda x: x[1])
    if len(sorted_pcts) >= 2:
        weakest_subj, weakest_pct = sorted_pcts[0]
        second_subj, second_pct = sorted_pcts[1]
        gap = second_pct - weakest_pct

        if gap > 20:
            _add(f'与其他学科存在明显差距（百分位{weakest_pct}%），建议优先补齐该科短板，有助于提升整体竞争力。', weakest_subj)
        else:
            low_subjects = [s for s, p in sorted_pcts if p < 40]
            if len(low_subjects) >= 2:
                _add('当前多科都存在提升空间，建议优先选择最容易突破的一门集中投入，而非平均分配时间。')

    # ── 3. 主科权重提示 ──
    lang_pcts = [percentiles.get(s, 0) for s in SUBJECTS_LANG]
    sci_pcts = [percentiles.get(s, 0) for s in SUBJECTS_SCI]
    avg_lang_pct = sum(lang_pcts) / len(lang_pcts) if lang_pcts else 0
    max_sci_pct = max(sci_pcts) if sci_pcts else 0

    if avg_lang_pct > max_sci_pct + 15:
        _add('语数英三门对总成绩影响更大，每提升10分对年级排名的拉动通常优于小三门。如学习时间有限，可优先保障语数英的投入。')
    elif max_sci_pct < 30 and avg_lang_pct > 40:
        _add('当前小三门与主科存在差距，但由于语数英分值权重更高，建议在保持主科的同时适度关注小三门基础。')

    # ── 4. 总排名趋势（连续3次同方向才触发） ──
    valid_ranks = [r for r in rank_trend if r is not None]
    if len(valid_ranks) >= 3:
        consecutive_decline = all(
            valid_ranks[i] <= valid_ranks[i + 1] for i in range(len(valid_ranks) - 1)
        )
        consecutive_rise = all(
            valid_ranks[i] >= valid_ranks[i + 1] for i in range(len(valid_ranks) - 1)
        )
        if consecutive_decline:
            _add('总排名连续多次下降，建议均衡分配各科学习时间，避免过度集中某一科而忽略其他科目。')
        elif consecutive_rise:
            _add('总排名持续上升，说明整体学习策略有效，继续加油！')

    # ── 5. 排名区间分析 ──
    grade_total = 480
    if valid_ranks:
        current_rank = valid_ranks[-1]
        rank_pct = current_rank / grade_total * 100 if grade_total else 100
        if rank_pct <= 5:
            _add('你目前处于年级前5%，属于领先位置，建议保持优势、稳中求进。')
        elif rank_pct <= 20:
            _add('你目前处于年级前20%，已具备较强竞争力，可冲刺更高目标。')
        elif rank_pct <= 50:
            _add('你目前处于年级中游，基础较稳，仍有明显提升空间。')
        elif rank_pct <= 80:
            _add('你目前处于年级中后段，建议加强基础训练，提高稳定性。')
        else:
            _add('你目前处于年级后20%，建议优先巩固基础知识，逐步建立信心。')

    # ── 6. 波动稳定性分析 ──
    for subj in SUBJECTS:
        trend = subject_trends.get(subj, [])
        valid = [v for v in trend if v is not None]
        if len(valid) < 3:
            continue
        mean_val = sum(valid) / len(valid)
        if mean_val == 0:
            continue
        std_val = stats_mod.stdev(valid)
        cv = std_val / mean_val
        if cv > 0.25:
            _add(f'成绩波动较大（标准差{std_val:.1f}），建议回顾错题类型、提升发挥稳定性，比单纯增加练习量更重要。', subj)
        elif cv < 0.08 and len(valid) >= 4:
            _add(f'成绩较为稳定，说明知识掌握比较扎实，可继续保持当前学习节奏。', subj)

    # ── 7. 优势科保护 ──
    for subj in SUBJECTS:
        pct = percentiles.get(subj, 0)
        if pct >= 90:
            _add(f'目前处于年级前10%，是你的核心优势科目，建议优先保持优势，避免因过度投入其他科目导致优势缩水。', subj)

    # ── 8. 最近一次发挥 ──
    for subj in SUBJECTS:
        trend = subject_trends.get(subj, [])
        valid = [v for v in trend if v is not None]
        if len(valid) < 3:
            continue
        last_val = valid[-1]
        hist_mean = sum(valid[:-1]) / len(valid[:-1])
        diff = last_val - hist_mean
        max_score = 150 if subj in SUBJECTS_LANG else 100
        threshold = max_score * 0.1
        if diff > threshold:
            _add(f'最近一次考试发挥明显优于平时水平，建议总结本次成功经验。', subj)
        elif diff < -threshold:
            _add(f'最近一次考试成绩低于历史平均水平，不必过度焦虑，更建议分析本次失分原因。', subj)

    # ── 9. 排名变化幅度 ──
    if len(valid_ranks) >= 2:
        rank_change = valid_ranks[0] - valid_ranks[-1]
        if rank_change >= 100:
            _add(f'最近排名提升超过100名（从第{valid_ranks[0]}名到第{valid_ranks[-1]}名），说明近期学习策略取得了较好的效果，建议继续保持。')
        elif rank_change <= -100:
            _add(f'最近排名下降超过100名（从第{valid_ranks[0]}名到第{valid_ranks[-1]}名），建议认真分析原因，及时调整学习策略。')

    # ── 10. 综合学习重心建议（汇总决策） ──
    summary = _build_summary(last_raw, last_assigned, percentiles)
    if summary:
        advice.append({'subject': None, 'text': summary, 'is_summary': True})

    if not advice:
        advice.append({'subject': None, 'text': '各科表现较为稳定，建议维持当前学习节奏，重点关注自己有提升空间的科目。', 'is_summary': False})

    # 将所有纯字符串条目转为结构化格式（兼容前面直接append的字符串）
    structured = []
    for item in advice:
        if isinstance(item, str):
            structured.append({'subject': None, 'text': item, 'is_summary': False})
        else:
            structured.append(item)

    # 按科目归并：同一科目的多条建议合并为一条
    merged = []
    subject_items = {}  # subj -> [texts]
    general_items = []  # 非科目相关的建议
    summary_item = None

    for item in structured:
        if item.get('is_summary'):
            summary_item = item
        elif item['subject']:
            subj = item['subject']
            if subj not in subject_items:
                subject_items[subj] = []
            subject_items[subj].append(item['text'])
        else:
            general_items.append(item['text'])

    # 按 SUBJECTS 顺序输出科目建议（归并后）
    for subj in SUBJECTS:
        if subj in subject_items:
            texts = subject_items[subj]
            merged_text = '；'.join(texts) + '。' if len(texts) > 1 else texts[0]
            # 去掉末尾多余的句号
            merged_text = merged_text.replace('。。', '。')
            merged.append({'subject': subj, 'text': merged_text, 'is_summary': False})

    # 添加通用建议（排名区间、主科权重、排名趋势等）
    for text in general_items:
        merged.append({'subject': None, 'text': text, 'is_summary': False})

    # 最后放总建议（加粗标记）
    if summary_item:
        merged.append(summary_item)

    current_app.logger.info(f"[ADVICE] generated {len(merged)} items (merged from {len(structured)})")
    return merged


def _build_summary(last_raw, last_assigned, percentiles):
    """汇总ROI+短板+权重，生成一段本阶段学习重心建议。"""
    invest = []   # 值得投入的科目
    maintain = [] # 保持即可的科目

    for subj in SUBJECTS:
        raw = last_raw.get(subj)
        if raw is None:
            continue
        tier, _ = _get_roi_tier(subj, raw)
        pct = percentiles.get(subj, 50)

        if tier == 'low':
            invest.append((subj, pct, '基础提升空间大'))
        elif tier == 'mid' and pct < 40:
            invest.append((subj, pct, '有提升空间'))
        elif tier == 'high':
            maintain.append(subj)

    # 按百分位升序排列（最弱的排前面）
    invest.sort(key=lambda x: x[1])

    if not invest and not maintain:
        return ''

    parts = []

    # 最值得投入的1-2科
    if invest:
        top_invest = invest[:2]
        names_reasons = []
        for subj, pct, reason in top_invest:
            names_reasons.append(f'{subj}（{reason}）')
        focus_str = '和'.join(names_reasons)
        parts.append(f'目前最值得投入精力的是{focus_str}')

        # 如果最弱科是单科短板（与次弱差距>20%），强调优先
        if len(invest) >= 2 and invest[1][1] - invest[0][1] > 20:
            parts.append(f'其中「{invest[0][0]}」是当前最明显的短板，建议优先巩固基础')
        else:
            parts.append(f'建议根据自身情况合理分配时间')

    # 应保持的科目
    if maintain:
        maintain_str = '、'.join(maintain)
        parts.append(f'{maintain_str}已处于较好水平，保持稳定即可')

    if not parts:
        return ''

    return '📋 本阶段建议：综合来看，' + '；'.join(parts) + '。'
