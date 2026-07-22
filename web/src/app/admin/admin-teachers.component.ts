import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '@app/core/services/api.service';
import { AuthService } from '@app/auth/auth.service';

@Component({
  selector: 'app-admin-teachers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatInputModule, MatCardModule],
  template: `
    <div class="header">
      <h2>老师管理</h2>
      <div class="nav-buttons">
        <a mat-raised-button routerLink="/admin/students">学生</a>
        <a mat-raised-button routerLink="/admin/classes">班级</a>
        <a mat-raised-button routerLink="/admin/scores">成绩</a>
        <button mat-raised-button color="warn" (click)="logout()">登出</button>
      </div>
    </div>
    <mat-card class="add-card">
      <mat-card-header><mat-card-title>添加老师</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="form-row">
          <mat-form-field appearance="outline"><mat-label>姓名</mat-label><input matInput [(ngModel)]="newTeacher.teacherName"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>科目</mat-label><input matInput [(ngModel)]="newTeacher.subject"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>用户名</mat-label><input matInput [(ngModel)]="newTeacher.username"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>密码</mat-label><input matInput [(ngModel)]="newTeacher.password"></mat-form-field>
          <button mat-raised-button color="primary" (click)="addTeacher()">添加</button>
        </div>
      </mat-card-content>
    </mat-card>
    <table mat-table [dataSource]="teachers" class="mat-elevation-z8 data-table">
      <ng-container matColumnDef="teacherId"><th mat-header-cell *matHeaderCellDef>ID</th><td mat-cell *matCellDef="let r">{{r.teacherId}}</td></ng-container>
      <ng-container matColumnDef="teacherName"><th mat-header-cell *matHeaderCellDef>姓名</th><td mat-cell *matCellDef="let r">{{r.teacherName}}</td></ng-container>
      <ng-container matColumnDef="subject"><th mat-header-cell *matHeaderCellDef>科目</th><td mat-cell *matCellDef="let r">{{r.subject}}</td></ng-container>
      <ng-container matColumnDef="username"><th mat-header-cell *matHeaderCellDef>用户名</th><td mat-cell *matCellDef="let r">{{r.username}}</td></ng-container>
      <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>操作</th><td mat-cell *matCellDef="let r"><button mat-button color="warn" (click)="deleteTeacher(r.teacherId)">删除</button></td></ng-container>
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
export class AdminTeachersComponent implements OnInit {
  displayedColumns = ['teacherId', 'teacherName', 'subject', 'username', 'actions'];
  teachers: any[] = [];
  newTeacher = { teacherName: '', subject: '', username: '', password: '' };

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    console.log(`[AdminTeachersComponent] ngOnInit`);
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.apiService.getTeachers().subscribe({
      next: (data) => { this.teachers = data; console.log(`[AdminTeachersComponent] loaded ${data.length} teachers`); },
      error: (err) => console.error(`[AdminTeachersComponent] loadTeachers failed:`, err)
    });
  }

  addTeacher(): void {
    if (!this.newTeacher.teacherName || !this.newTeacher.subject || !this.newTeacher.username || !this.newTeacher.password) {
      alert('请填写完整信息'); return;
    }
    console.log(`[AdminTeachersComponent] adding teacher: ${this.newTeacher.username}`);
    this.apiService.createTeacher(this.newTeacher).subscribe({
      next: () => {
        console.log(`[AdminTeachersComponent] teacher added`);
        this.newTeacher = { teacherName: '', subject: '', username: '', password: '' };
        this.loadTeachers();
      },
      error: (err) => { console.error(`[AdminTeachersComponent] addTeacher failed:`, err); alert('添加失败'); }
    });
  }

  deleteTeacher(teacherId: number): void {
    if (!confirm('确定删除？')) return;
    console.log(`[AdminTeachersComponent] deleting teacher: ${teacherId}`);
    this.apiService.deleteTeacher(teacherId).subscribe({
      next: () => { console.log(`[AdminTeachersComponent] teacher deleted`); this.loadTeachers(); },
      error: (err) => { console.error(`[AdminTeachersComponent] deleteTeacher failed:`, err); alert('删除失败'); }
    });
  }

  logout(): void { this.authService.logout(); }
}
