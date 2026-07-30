import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { StudentScoresComponent } from './student-scores.component';
import { StudentLearningAdviceComponent } from './student-learning-advice.component';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-student-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    StudentScoresComponent,
    StudentLearningAdviceComponent,
  ],
  template: `
    <div class="shell-container">
      <div class="shell-header">
        <h2>{{ studentName }}</h2>
        <button mat-raised-button color="warn" (click)="logout()">登出</button>
      </div>
      <mat-tab-group animationDuration="200ms" class="student-tabs">
        <mat-tab label="📝 成绩查询">
          <app-student-scores></app-student-scores>
        </mat-tab>
        <mat-tab label="💡 学习建议">
          <app-student-learning-advice></app-student-learning-advice>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .shell-container { min-height: 100vh; background: #fafafa; }
    .shell-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px; background: #fff; border-bottom: 1px solid #e0e0e0;
    }
    .shell-header h2 { margin: 0; font-size: 20px; color: #333; }
    .student-tabs ::ng-deep .mat-mdc-tab-body-wrapper { flex: 1; }
  `]
})
export class StudentShellComponent {
  studentName = '';

  constructor(private authService: AuthService) {
    const student = this.authService.getStudent();
    this.studentName = student ? student.name : '学生';
  }

  logout() {
    this.authService.logout();
  }
}
