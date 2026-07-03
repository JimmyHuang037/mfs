import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '@app/core/services/api.service';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { Student, Score } from '@app/models'; // 确保正确导入

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedInStudent: Student | null = null;

  constructor(private apiService: ApiService, private router: Router) {}

  async login(studentId: string, password: string): Promise<boolean> {
    try {
      const response = await lastValueFrom(
        this.apiService.login(studentId, password)
      );
      
      if (!response?.scores) {
        throw new Error('未获取到成绩数据');
      }
      
      this.loggedInStudent = {
        name: response.name,
        studentId: response.student_id,
        scores: response.scores.map((s: any) => ({
          ...s,
          studentId: response.student_id
        }))
      };
      
      return true;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  }

  isLoggedIn(): boolean {
    return !!this.loggedInStudent;
  }

  getLoggedInStudent(): Student | null {
    return this.loggedInStudent ? { ...this.loggedInStudent } : null;
  }

  logout(): void {
    this.loggedInStudent = null;
  }
}
