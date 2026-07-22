import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '@app/core/services/api.service';
import { AuthService } from '@app/auth/auth.service';
import { Student } from '@app/models';

@Component({
  selector: 'app-admin-students',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule],
  template: `
    <div class="header">
      <h2>学生管理</h2>
      <div class="nav-buttons">
        <a mat-raised-button routerLink="/admin/teachers">老师</a>
        <a mat-raised-button routerLink="/admin/classes">班级</a>
        <a mat-raised-button routerLink="/admin/scores">成绩</a>
        <button mat-raised-button color="warn" (click)="logout()">登出</button>
      </div>
    </div>
    <mat-card class="add-card">
      <mat-card-header><mat-card-title>添加学生</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="form-row">
          <mat-form-field appearance="outline"><mat-label>学号</mat-label><input matInput [(ngModel)]="newStudent.studentId"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>姓名</mat-label><input matInput [(ngModel)]="newStudent.name"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>密码</mat-label><input matInput [(ngModel)]="newStudent.password"></mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>班级</mat-label>
            <mat-select [(ngModel)]="newStudent.classId">
              <mat-option *ngFor="let c of classes" [value]="c.classId">{{c.className}}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="addStudent()">添加</button>
        </div>
      </mat-card-content>
    </mat-card>
    <table mat-table [dataSource]="students" class="mat-elevation-z8 data-table">
      <ng-container matColumnDef="studentId"><th mat-header-cell *matHeaderCellDef>学号</th><td mat-cell *matCellDef="let r">{{r.studentId}}</td></ng-container>
      <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>姓名</th><td mat-cell *matCellDef="let r">{{r.name}}</td></ng-container>
      <ng-container matColumnDef="classId"><th mat-header-cell *matHeaderCellDef>班级</th><td mat-cell *matCellDef="let r">{{getClassName(r.classId)}}</td></ng-container>
      <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>操作</th><td mat-cell *matCellDef="let r"><button mat-button color="warn" (click)="deleteStudent(r.studentId)">删除</button></td></ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let r; columns: displayedColumns;"></tr>
    </table>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; }
    .nav-buttons { display: flex; gap: 8px; }
    .add-card { margin: 16px 24px; }
    .form-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .data-table { width: calc(100% - 48px); margin: 16px 24px; }
  `]
})
export class AdminStudentsComponent implements OnInit {
  displayedColumns = ['studentId', 'name', 'classId', 'actions'];
  students: any[] = [];
  classes: any[] = [];
  newStudent = { studentId: '', name: '', password: '', classId: null as number | null };

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    console.log(`[AdminStudentsComponent] ngOnInit`);
    this.loadData();
  }

  loadData(): void {
    this.apiService.getStudents().subscribe({
      next: (data) => { this.students = data; console.log(`[AdminStudentsComponent] loaded ${data.length} students`); },
      error: (err) => console.error(`[AdminStudentsComponent] loadStudents failed:`, err)
    });
    this.apiService.getClasses().subscribe({
      next: (data) => { this.classes = data; console.log(`[AdminStudentsComponent] loaded ${data.length} classes`); },
      error: (err) => console.error(`[AdminStudentsComponent] loadClasses failed:`, err)
    });
  }

  getClassName(classId: number): string {
    const cls = this.classes.find((c: any) => c.classId === classId);
    return cls ? (cls as any).className : '-';
  }

  addStudent(): void {
    if (!this.newStudent.studentId || !this.newStudent.name || !this.newStudent.password) {
      alert('请填写学号、姓名和密码'); return;
    }
    console.log(`[AdminStudentsComponent] adding student: ${this.newStudent.studentId}`);
    this.apiService.createStudent(this.newStudent).subscribe({
      next: () => {
        console.log(`[AdminStudentsComponent] student added`);
        this.newStudent = { studentId: '', name: '', password: '', classId: null };
        this.loadData();
      },
      error: (err) => { console.error(`[AdminStudentsComponent] addStudent failed:`, err); alert('添加失败'); }
    });
  }

  deleteStudent(studentId: string): void {
    if (!confirm(`确定删除学生 ${studentId}？`)) return;
    console.log(`[AdminStudentsComponent] deleting student: ${studentId}`);
    this.apiService.deleteStudent(studentId).subscribe({
      next: () => { console.log(`[AdminStudentsComponent] student deleted`); this.loadData(); },
      error: (err) => { console.error(`[AdminStudentsComponent] deleteStudent failed:`, err); alert('删除失败'); }
    });
  }

  logout(): void { this.authService.logout(); }
}
