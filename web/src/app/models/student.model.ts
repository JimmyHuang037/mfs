export interface Student {
  name: string;
  studentId: string;
  scores?: Score[];
}

export interface Score {
  score: number;
  subject: string;
  type: string;
}
