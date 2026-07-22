export * from './student.model';
export * from './teacher.model';
export * from './admin.model';

/** 科目列表（与后端 SUBJECTS 保持一致） */
export const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '政治'] as const;

/** 语数英（原始分 0-150） */
export const SUBJECTS_LANG = ['语文', '数学', '英语'] as const;

/** 物化政（赋分 40-70） */
export const SUBJECTS_SCI = ['物理', '化学', '政治'] as const;

/** 考试类型顺序 */
export const EXAM_TYPE_ORDER = ['monthly1', 'monthly2', 'midterm', 'final'] as const;

/** 考试类型中文映射 */
export const EXAM_TYPE_LABELS: Record<string, string> = {
  monthly1: '月考1',
  monthly2: '月考2',
  midterm: '期中',
  final: '期末',
};
