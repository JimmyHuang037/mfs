import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, MatInputModule, MatButtonModule, MatFormFieldModule, MatTabsModule, ReactiveFormsModule],
  template: `
    <mat-card class="login-card">
      <mat-card-header>
        <mat-card-title>学生管理系统</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-tab-group (selectedTabChange)="onTabChange($event.index)">
          <mat-tab label="学生登录">
            <form [formGroup]="studentForm" (ngSubmit)="onStudentLogin()" class="login-form">
              <mat-form-field appearance="outline">
                <mat-label>学号</mat-label>
                <input matInput formControlName="studentId" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>密码</mat-label>
                <input matInput type="password" formControlName="password" required>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="!studentForm.valid">登录</button>
            </form>
          </mat-tab>
          <mat-tab label="老师登录">
            <form [formGroup]="teacherForm" (ngSubmit)="onTeacherLogin()" class="login-form">
              <mat-form-field appearance="outline">
                <mat-label>用户名</mat-label>
                <input matInput formControlName="username" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>密码</mat-label>
                <input matInput type="password" formControlName="password" required>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="!teacherForm.valid">登录</button>
            </form>
          </mat-tab>
          <mat-tab label="管理员登录">
            <form [formGroup]="adminForm" (ngSubmit)="onAdminLogin()" class="login-form">
              <mat-form-field appearance="outline">
                <mat-label>用户名</mat-label>
                <input matInput formControlName="username" required>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>密码</mat-label>
                <input matInput type="password" formControlName="password" required>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="!adminForm.valid">登录</button>
            </form>
          </mat-tab>
        </mat-tab-group>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .login-card { width: 450px; margin: 50px auto; }
    .login-form { display: flex; flex-direction: column; padding-top: 16px; }
    mat-form-field { margin-bottom: 8px; }
  `]
})
export class LoginComponent {
  studentForm: FormGroup;
  teacherForm: FormGroup;
  adminForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    console.log(`[LoginComponent] initialized`);
    this.studentForm = this.fb.group({
      studentId: ['', Validators.required],
      password: ['', Validators.required]
    });
    this.teacherForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    this.adminForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onTabChange(index: number): void {
    console.log(`[LoginComponent] tab changed to index=${index}`);
  }

  async onStudentLogin(): Promise<void> {
    const { studentId, password } = this.studentForm.value;
    console.log(`[LoginComponent] student login attempt: studentId=${studentId}`);
    if (await this.authService.loginStudent(studentId, password)) {
      console.log(`[LoginComponent] student login success, navigating to /student/scores`);
      this.router.navigate(['/student/scores']);
    } else {
      alert('登录失败，请检查学号和密码');
    }
  }

  async onTeacherLogin(): Promise<void> {
    const { username, password } = this.teacherForm.value;
    console.log(`[LoginComponent] teacher login attempt: username=${username}`);
    if (await this.authService.loginTeacher(username, password)) {
      console.log(`[LoginComponent] teacher login success, navigating to /teacher/scores`);
      this.router.navigate(['/teacher/scores']);
    } else {
      alert('登录失败，请检查用户名和密码');
    }
  }

  async onAdminLogin(): Promise<void> {
    const { username, password } = this.adminForm.value;
    console.log(`[LoginComponent] admin login attempt: username=${username}`);
    if (await this.authService.loginAdmin(username, password)) {
      console.log(`[LoginComponent] admin login success, navigating to /admin/students`);
      this.router.navigate(['/admin/students']);
    } else {
      alert('登录失败，请检查用户名和密码');
    }
  }
}
