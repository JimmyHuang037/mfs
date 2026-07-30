export interface Teacher {
  teacherId: number;
  teacherName: string;
  subject: string;
  username: string;
  classes?: ClassInfo[];
}

export interface ClassInfo {
  classId: number;
  className: string;
}
