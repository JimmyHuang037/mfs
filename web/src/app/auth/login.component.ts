import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

// Angular Material 模块
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';

// 表单模块
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    // 添加所有必要的模块
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  template: `
    <mat-card class="login-card">
      <mat-card-header>
        <mat-card-title>登录</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
          <mat-form-field appearance="outline">
            <mat-label>用户名</mat-label>
            <input matInput formControlName="username" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>密码</mat-label>
            <input matInput type="password" formControlName="password" required>
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit" [disabled]="!loginForm.valid">
            登录
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .login-card {
      width: 400px;
      margin: 50px auto;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    mat-form-field {
      margin-bottom: 16px;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  async onLogin(): Promise<void> {
    const { username, password } = this.loginForm.value;
    if (await this.authService.login(username, password)) {
      this.router.navigate(['/students']);
    } else {
      alert('登录失败，请检查用户名和密码');
    }
  }
}