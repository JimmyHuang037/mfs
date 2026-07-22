import { Injectable } from '@angular/core';
import { ApiService } from '@app/core/services/api.service';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { Student, Teacher, Admin } from '@app/models';

export type UserRole = 'student' | 'teacher' | 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser: Student | Teacher | Admin | null = null;
  private currentRole: UserRole | null = null;

  constructor(private apiService: ApiService, private router: Router) {}

  async loginStudent(studentId: string, password: string): Promise<boolean> {
    console.log(`[AuthService] loginStudent attempt: studentId=${studentId}`);
    try {
      const response = await lastValueFrom(this.apiService.loginStudent(studentId, password));
      this.currentUser = {
        studentId: response.studentId,
        name: response.name,
        classId: response.classId,
        scores: (response.scores || []).map((s: any) => ({
          id: s.id,
          studentId: s.studentId,
          subject: s.subject,
          type: s.type,
          score: s.score
        }))
      };
      this.currentRole = 'student';
      console.log(`[AuthService] loginStudent success: name=${response.name}`);
      return true;
    } catch (error) {
      console.error(`[AuthService] loginStudent failed:`, error);
      return false;
    }
  }

  async loginTeacher(username: string, password: string): Promise<boolean> {
    console.log(`[AuthService] loginTeacher attempt: username=${username}`);
    try {
      const response = await lastValueFrom(this.apiService.loginTeacher(username, password));
      this.currentUser = {
        teacherId: response.teacherId,
        teacherName: response.teacherName,
        subject: response.subject,
        username: response.username,
        classes: response.classes || []
      };
      this.currentRole = 'teacher';
      console.log(`[AuthService] loginTeacher success: name=${response.teacherName}`);
      return true;
    } catch (error) {
      console.error(`[AuthService] loginTeacher failed:`, error);
      return false;
    }
  }

  async loginAdmin(username: string, password: string): Promise<boolean> {
    console.log(`[AuthService] loginAdmin attempt: username=${username}`);
    try {
      const response = await lastValueFrom(this.apiService.loginAdmin(username, password));
      this.currentUser = {
        id: response.id,
        username: response.username,
        name: response.name
      };
      this.currentRole = 'admin';
      console.log(`[AuthService] loginAdmin success: name=${response.name}`);
      return true;
    } catch (error) {
      console.error(`[AuthService] loginAdmin failed:`, error);
      return false;
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null && this.currentRole !== null;
  }

  getRole(): UserRole | null {
    return this.currentRole;
  }

  getUser(): Student | Teacher | Admin | null {
    return this.currentUser;
  }

  getStudent(): Student | null {
    return this.currentRole === 'student' ? (this.currentUser as Student) : null;
  }

  getTeacher(): Teacher | null {
    return this.currentRole === 'teacher' ? (this.currentUser as Teacher) : null;
  }

  getAdmin(): Admin | null {
    return this.currentRole === 'admin' ? (this.currentUser as Admin) : null;
  }

  logout(): void {
    console.log(`[AuthService] logout, role=${this.currentRole}`);
    this.currentUser = null;
    this.currentRole = null;
    this.router.navigate(['/login']);
  }
}
