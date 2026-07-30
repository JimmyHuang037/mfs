#!/usr/bin/env python3
"""
生成 MFS 完整数据库初始化 SQL。
480学生(S前缀学号)，12班级，6科目，4考试类型。
语数英原始分0-150，物化政原始分0-100（API层赋分）。
成绩波动模型：能力值 × 考试难度 + 个人噪声。
18位老师（每科3人，每人教4班）。

配合 db/students_db.sql 使用:
  mysql -u root -p student_db < db/students_db.sql
  python db/generate_data.py | mysql -u root -p student_db
"""

import random
import argparse
from datetime import date, timedelta

random.seed(42)

CLASS_COUNT = 12
STUDENTS_PER_CLASS = 40
SUBJECTS_LANG = ['语文', '数学', '英语']       # 原始分 0-150
SUBJECTS_SCI = ['物理', '化学', '政治']         # 原始分 0-100
ALL_SUBJECTS = SUBJECTS_LANG + SUBJECTS_SCI
EXAM_TYPES = ['monthly1', 'monthly2', 'midterm', 'final']

# 考试难度系数 (影响绝对分数，不影响排名)
EXAM_DIFFICULTY = {
    'monthly1': 0.70,   # 最难
    'monthly2': 0.85,
    'midterm':  0.75,
    'final':    0.90,   # 最易
}

CHINESE_SURNAMES = [
    '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈',
    '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许',
    '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏',
    '陶', '姜', '戚', '谢', '邹', '喻', '柏', '水', '窦', '章',
    '云', '苏', '潘', '葛', '奚', '范', '彭', '郎', '鲁', '韦',
    '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳',
    '丰', '鲍', '史', '唐', '费', '廉', '岑', '薛', '雷', '贺',
    '倪', '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常',
    '乐', '于', '时', '傅', '皮', '卞', '齐', '康', '伍', '余',
    '元', '卜', '顾', '孟', '平', '黄', '和', '穆', '萧', '尹',
]

CHINESE_GIVEN = [
    '明', '华', '强', '伟', '芳', '敏', '静', '丽', '磊', '军',
    '洋', '勇', '杰', '涛', '超', '平', '刚', '文', '鑫', '慧',
    '宇', '琳', '浩', '雪', '晨', '博', '嘉', '怡', '睿', '彤',
    '轩', '涵', '梓', '萱', '哲', '辰', '宁', '安', '乐', '瑶',
    '毅', '辉', '洁', '婷', '梅', '兰', '凤', '龙', '悦', '蕾',
]


def generate_student_name(index):
    surname = CHINESE_SURNAMES[index % len(CHINESE_SURNAMES)]
    given = CHINESE_GIVEN[(index * 7 + 3) % len(CHINESE_GIVEN)]
    if index % 7 == 0:
        given2 = CHINESE_GIVEN[(index * 11 + 5) % len(CHINESE_GIVEN)]
        given += given2
    return surname + given


def generate_student_abilities():
    """为每个学生生成6科独立能力值。
    语文中心100/150，数学英语中心120/150，物理化学中心80/100，政治中心60/100。"""
    abilities = {}
    abilities['语文'] = max(20, min(150, random.gauss(100, 20)))
    abilities['数学'] = max(20, min(150, random.gauss(120, 20)))
    abilities['英语'] = max(20, min(150, random.gauss(120, 20)))
    abilities['物理'] = max(10, min(100, random.gauss(80, 15)))
    abilities['化学'] = max(10, min(100, random.gauss(80, 15)))
    abilities['政治'] = max(10, min(100, random.gauss(60, 15)))
    return abilities


def generate_raw_score(ability, exam_type, max_score):
    """能力值 × 难度系数 + 个人噪声 → 原始分。clamp到[0, max_score]。"""
    difficulty = EXAM_DIFFICULTY[exam_type]
    noise = random.gauss(0, 8)
    raw = ability * difficulty + noise
    raw = max(0, min(max_score, raw))
    return round(raw * 2) / 2  # 0.5 步长


def generate_teachers_18():
    """生成18位老师，每科3人。"""
    teacher_configs = [
        # 语文
        ('张建国', '语文', 'zhangjg'),
        ('李文华', '语文', 'liwh'),
        ('王秀兰', '语文', 'wangxl'),
        # 数学
        ('刘志强', '数学', 'liuzq'),
        ('陈明远', '数学', 'chenmy'),
        ('赵丽萍', '数学', 'zhaolp'),
        # 英语
        ('孙伟杰', '英语', 'sunwj'),
        ('周雅琴', '英语', 'zhouyq'),
        ('吴晓东', '英语', 'wuxd'),
        # 物理
        ('郑浩然', '物理', 'zhenghr'),
        ('黄思远', '物理', 'huangsy'),
        ('林婉清', '物理', 'linwq'),
        # 化学
        ('何俊杰', '化学', 'hejj'),
        ('曹雪梅', '化学', 'caoxm'),
        ('许文博', '化学', 'xuwb'),
        # 政治
        ('邓晓峰', '政治', 'dengxf'),
        ('萧雨桐', '政治', 'xiaoyt'),
        ('冯志远', '政治', 'fengzy'),
    ]
    return teacher_configs


def main():
    parser = argparse.ArgumentParser(description='Generate MFS seed data SQL')
    parser.add_argument('--exam-date', default='2026-05-20',
                        help='Base date for exams')
    parser.add_argument('--password', default='123456',
                        help='Default password for all users')
    args = parser.parse_args()

    base_date = date.fromisoformat(args.exam_date)
    password = args.password

    exam_dates = {
        'monthly1': base_date - timedelta(days=90),
        'monthly2': base_date - timedelta(days=60),
        'midterm':  base_date - timedelta(days=30),
        'final':    base_date,
    }

    lines = []
    def sql(s):
        lines.append(s)

    sql('-- ============================================')
    sql('-- MFS 完整种子数据 (v2)')
    sql('-- 语数英0-150, 物化政0-100(赋分制)')
    sql('-- 学号S前缀, 18位老师, 波动成绩模型')
    sql('-- ============================================')
    sql('')

    # ---- classes ----
    sql('-- 班级')
    sql('TRUNCATE TABLE classes;')
    for i in range(1, CLASS_COUNT + 1):
        sql(f"INSERT INTO classes (class_id, class_name) VALUES ({i}, '高一({i})班');")
    sql('')

    # ---- students (480) ----
    sql('-- 学生 (480人, S前缀学号)')
    sql('TRUNCATE TABLE students;')
    student_list = []  # (student_id, name, class_id, abilities)
    seq = 0
    for class_id in range(1, CLASS_COUNT + 1):
        for idx in range(1, STUDENTS_PER_CLASS + 1):
            name = generate_student_name(seq)
            student_id = f'S{class_id:02d}{idx:02d}'
            abilities = generate_student_abilities()
            sql(f"INSERT INTO students (student_id, name, password, class_id) "
                f"VALUES ('{student_id}', '{name}', '{password}', {class_id});")
            student_list.append((student_id, name, class_id, abilities))
            seq += 1
    sql('')

    # ---- teachers (18) + teacher_class ----
    sql('-- 老师 (18人, 每科3人, 每人教4班)')
    sql('TRUNCATE TABLE teachers;')
    sql('TRUNCATE TABLE teacher_class;')
    teachers = generate_teachers_18()
    for tid, (tname, subj, uname) in enumerate(teachers, 1):
        sql(f"INSERT INTO teachers (teacher_id, teacher_name, subject, username, password) "
            f"VALUES ({tid}, '{tname}', '{subj}', '{uname}', '{password}');")
        # 每科3人，每人教4班：按科目分组后分配
        subject_teachers = [t for t in teachers if t[1] == subj]
        teacher_index_in_subject = subject_teachers.index((tname, subj, uname))
        # 分配4个班：第0人教1-4班，第1人教5-8班，第2人教9-12班
        start_class = teacher_index_in_subject * 4 + 1
        for cid in range(start_class, start_class + 4):
            sql(f"INSERT INTO teacher_class (teacher_id, class_id) VALUES ({tid}, {cid});")
    sql('')

    # ---- admins ----
    sql('-- 管理员')
    sql('TRUNCATE TABLE admins;')
    sql("INSERT INTO admins (username, password, name) VALUES ('admin', 'admin', '系统管理员');")
    sql('')

    # ---- scores ----
    sql('-- 成绩 (480人 × 4考试 × 6科 = 11520条)')
    sql('-- 语数英: 原始分0-150, 物化政: 原始分0-100')
    sql('TRUNCATE TABLE scores;')
    score_id = 1
    for student_id, name, class_id, abilities in student_list:
        for etype in EXAM_TYPES:
            exam_date = exam_dates[etype]
            for subj in ALL_SUBJECTS:
                max_score = 150 if subj in SUBJECTS_LANG else 100
                score_val = generate_raw_score(abilities[subj], etype, max_score)
                sql(f"INSERT INTO scores (id, student_id, subject, type, score, exam_date) "
                    f"VALUES ({score_id}, '{student_id}', '{subj}', '{etype}', {score_val}, '{exam_date}');")
                score_id += 1
    sql('')

    print('\n'.join(lines))


if __name__ == '__main__':
    main()
