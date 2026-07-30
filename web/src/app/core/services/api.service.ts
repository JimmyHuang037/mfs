import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student, Score, Teacher, ClassInfo } from '@app/models';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log(`[ApiService] initialized, baseUrl=${this.apiUrl}`);
  }

  // Auth
  loginStudent(studentId: string, password: string): Observable<any> {
    console.log(`[ApiService] POST /api/auth/login/student - studentId=${studentId}`);
    return this.http.post(`${this.apiUrl}/api/auth/login/student`, { student_id: studentId, password });
  }

  loginTeacher(username: string, password: string): Observable<any> {
    console.log(`[ApiService] POST /api/auth/login/teacher - username=${username}`);
    return this.http.post(`${this.apiUrl}/api/auth/login/teacher`, { username, password });
  }

  loginAdmin(username: string, password: string): Observable<any> {
    console.log(`[ApiService] POST /api/auth/login/admin - username=${username}`);
    return this.http.post(`${this.apiUrl}/api/auth/login/admin`, { username, password });
  }

  // Students
  getStudents(): Observable<Student[]> {
    console.log(`[ApiService] GET /api/students`);
    return this.http.get<Student[]>(`${this.apiUrl}/api/students`);
  }

  getStudent(studentId: string): Observable<any> {
    console.log(`[ApiService] GET /api/students/${studentId}`);
    return this.http.get<any>(`${this.apiUrl}/api/students/${studentId}`);
  }

  createStudent(data: any): Observable<any> {
    console.log(`[ApiService] POST /api/students - studentId=${data.student_id}`);
    return this.http.post(`${this.apiUrl}/api/students`, data);
  }

  updateStudent(studentId: string, data: any): Observable<any> {
    console.log(`[ApiService] PUT /api/students/${studentId}`);
    return this.http.put(`${this.apiUrl}/api/students/${studentId}`, data);
  }

  deleteStudent(studentId: string): Observable<any> {
    console.log(`[ApiService] DELETE /api/students/${studentId}`);
    return this.http.delete(`${this.apiUrl}/api/students/${studentId}`);
  }

  // Scores
  getAllScores(): Observable<Score[]> {
    console.log(`[ApiService] GET /api/scores`);
    return this.http.get<Score[]>(`${this.apiUrl}/api/scores`);
  }

  getScores(studentId: string): Observable<Score[]> {
    console.log(`[ApiService] GET /api/scores/student/${studentId}`);
    return this.http.get<Score[]>(`${this.apiUrl}/api/scores/student/${studentId}`);
  }

  addScore(data: any): Observable<any> {
    console.log(`[ApiService] POST /api/scores - studentId=${data.student_id}`);
    return this.http.post(`${this.apiUrl}/api/scores`, data);
  }

  updateScore(scoreId: number, data: any): Observable<any> {
    console.log(`[ApiService] PUT /api/scores/${scoreId}`);
    return this.http.put(`${this.apiUrl}/api/scores/${scoreId}`, data);
  }

  deleteScore(scoreId: number): Observable<any> {
    console.log(`[ApiService] DELETE /api/scores/${scoreId}`);
    return this.http.delete(`${this.apiUrl}/api/scores/${scoreId}`);
  }

  // Score Statistics (学生成绩查询系统)
  getExamTypes(studentId: string): Observable<any> {
    console.log(`[ApiService] GET /api/scores/exam-types?student_id=${studentId}`);
    return this.http.get(`${this.apiUrl}/api/scores/exam-types`, { params: { student_id: studentId } });
  }

  getScoreOverview(studentId: string, type: string, examDate: string): Observable<any> {
    console.log(`[ApiService] GET /api/scores/overview`);
    return this.http.get(`${this.apiUrl}/api/scores/overview`, {
      params: { student_id: studentId, type, exam_date: examDate }
    });
  }

  getScoreDetails(studentId: string, type: string, examDate: string): Observable<any> {
    console.log(`[ApiService] GET /api/scores/details`);
    return this.http.get(`${this.apiUrl}/api/scores/details`, {
      params: { student_id: studentId, type, exam_date: examDate }
    });
  }

  getSegmentStats(type: string, examDate: string, dimension: string, classId?: number, studentId?: string): Observable<any> {
    console.log(`[ApiService] GET /api/scores/segment-stats`);
    const params: any = { type, exam_date: examDate, dimension };
    if (classId) params.class_id = classId;
    if (studentId) params.student_id = studentId;
    return this.http.get(`${this.apiUrl}/api/scores/segment-stats`, { params });
  }

  getTopStudents(type: string, examDate: string): Observable<any> {
    console.log(`[ApiService] GET /api/scores/top-students`);
    return this.http.get(`${this.apiUrl}/api/scores/top-students`, {
      params: { type, exam_date: examDate }
    });
  }

  getLearningAdvice(studentId: string): Observable<any> {
    console.log(`[ApiService] GET /api/scores/learning-advice?student_id=${studentId}`);
    return this.http.get(`${this.apiUrl}/api/scores/learning-advice`, {
      params: { student_id: studentId }
    });
  }

  // Teachers
  getTeachers(): Observable<Teacher[]> {
    console.log(`[ApiService] GET /api/teachers`);
    return this.http.get<Teacher[]>(`${this.apiUrl}/api/teachers`);
  }

  getTeacher(teacherId: number): Observable<any> {
    console.log(`[ApiService] GET /api/teachers/${teacherId}`);
    return this.http.get<any>(`${this.apiUrl}/api/teachers/${teacherId}`);
  }

  createTeacher(data: any): Observable<any> {
    console.log(`[ApiService] POST /api/teachers`);
    return this.http.post(`${this.apiUrl}/api/teachers`, data);
  }

  updateTeacher(teacherId: number, data: any): Observable<any> {
    console.log(`[ApiService] PUT /api/teachers/${teacherId}`);
    return this.http.put(`${this.apiUrl}/api/teachers/${teacherId}`, data);
  }

  deleteTeacher(teacherId: number): Observable<any> {
    console.log(`[ApiService] DELETE /api/teachers/${teacherId}`);
    return this.http.delete(`${this.apiUrl}/api/teachers/${teacherId}`);
  }

  // Classes
  getClasses(): Observable<ClassInfo[]> {
    console.log(`[ApiService] GET /api/classes`);
    return this.http.get<ClassInfo[]>(`${this.apiUrl}/api/classes`);
  }

  createClass(data: any): Observable<any> {
    console.log(`[ApiService] POST /api/classes`);
    return this.http.post(`${this.apiUrl}/api/classes`, data);
  }

  updateClass(classId: number, data: any): Observable<any> {
    console.log(`[ApiService] PUT /api/classes/${classId}`);
    return this.http.put(`${this.apiUrl}/api/classes/${classId}`, data);
  }

  deleteClass(classId: number): Observable<any> {
    console.log(`[ApiService] DELETE /api/classes/${classId}`);
    return this.http.delete(`${this.apiUrl}/api/classes/${classId}`);
  }

  // Class students & scores (老师端)
  getClassStudents(classId: number): Observable<any[]> {
    console.log(`[ApiService] GET /api/classes/${classId}/students`);
    return this.http.get<any[]>(`${this.apiUrl}/api/classes/${classId}/students`);
  }

  getClassScores(classId: number, type?: string, examDate?: string): Observable<any[]> {
    console.log(`[ApiService] GET /api/classes/${classId}/scores?type=${type}&exam_date=${examDate}`);
    const params: any = {};
    if (type) params.type = type;
    if (examDate) params.exam_date = examDate;
    return this.http.get<any[]>(`${this.apiUrl}/api/classes/${classId}/scores`, { params });
  }

  // Statistics (老师端统计)
  getClassTotalRank(teacherId: number, type: string): Observable<any[]> {
    console.log(`[ApiService] GET /api/statistics/class-total-rank?teacher_id=${teacherId}`);
    return this.http.get<any[]>(`${this.apiUrl}/api/statistics/class-total-rank`, {
      params: { teacher_id: teacherId.toString(), type }
    });
  }

  getSubjectSegments(classId: number, teacherId: number, type: string): Observable<any> {
    console.log(`[ApiService] GET /api/statistics/subject-segments?class_id=${classId}`);
    return this.http.get(`${this.apiUrl}/api/statistics/subject-segments`, {
      params: { class_id: classId.toString(), teacher_id: teacherId.toString(), type }
    });
  }

  getClassTop3(classId: number, type: string): Observable<any> {
    console.log(`[ApiService] GET /api/statistics/class-top3?class_id=${classId}`);
    return this.http.get(`${this.apiUrl}/api/statistics/class-top3`, {
      params: { class_id: classId.toString(), type }
    });
  }

  getSubjectTeacherCompare(teacherId: number, type: string): Observable<any> {
    console.log(`[ApiService] GET /api/statistics/subject-teacher-compare?teacher_id=${teacherId}`);
    return this.http.get(`${this.apiUrl}/api/statistics/subject-teacher-compare`, {
      params: { teacher_id: teacherId.toString(), type }
    });
  }

  importScoresXlsx(file: File): Observable<any> {
    console.log(`[ApiService] POST /api/scores/import-xlsx - file=${file.name}`);
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/api/scores/import-xlsx`, formData);
  }

  // 学情分析 (老师端)
  getStudentAnalysis(teacherId: number): Observable<any> {
    console.log(`[ApiService] GET /api/statistics/student-analysis?teacher_id=${teacherId}`);
    return this.http.get(`${this.apiUrl}/api/statistics/student-analysis`, {
      params: { teacher_id: teacherId.toString() }
    });
  }

  getStudentTrajectory(studentId: string, subject: string): Observable<any> {
    console.log(`[ApiService] GET /api/statistics/student-trajectory?student_id=${studentId}&subject=${subject}`);
    return this.http.get(`${this.apiUrl}/api/statistics/student-trajectory`, {
      params: { student_id: studentId, subject }
    });
  }
}
