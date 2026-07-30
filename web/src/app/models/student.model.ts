export interface Student {
  id?: number;
  studentId: string;
  name: string;
  classId?: number;
  className?: string;
  scores?: Score[];
}

export interface Score {
  id?: number;
  studentId: string;
  subject: string;
  type: string;
  score: number | string;
}
