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
  selector: 'app-admin-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatInputModule, MatCardModule],
  template: `
    <div class="header">
      <h2>班级管理</h2>
      <div class="nav-buttons">
        <a mat-raised-button routerLink="/admin/students">学生</a>
        <a mat-raised-button routerLink="/admin/teachers">老师</a>
        <a mat-raised-button routerLink="/admin/scores">成绩</a>
        <button mat-raised-button color="warn" (click)="logout()">登出</button>
      </div>
    </div>
    <mat-card class="add-card">
      <mat-card-header><mat-card-title>添加班级</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="form-row">
          <mat-form-field appearance="outline"><mat-label>班级名称</mat-label><input matInput [(ngModel)]="newClassName"></mat-form-field>
          <button mat-raised-button color="primary" (click)="addClass()">添加</button>
        </div>
      </mat-card-content>
    </mat-card>
    <table mat-table [dataSource]="classes" class="mat-elevation-z8 data-table">
      <ng-container matColumnDef="classId"><th mat-header-cell *matHeaderCellDef>ID</th><td mat-cell *matCellDef="let r">{{r.classId}}</td></ng-container>
      <ng-container matColumnDef="className"><th mat-header-cell *matHeaderCellDef>班级名称</th><td mat-cell *matCellDef="let r">{{r.className}}</td></ng-container>
      <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>操作</th><td mat-cell *matCellDef="let r"><button mat-button color="warn" (click)="deleteClass(r.classId)">删除</button></td></ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let r; columns: displayedColumns;"></tr>
    </table>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; }
    .nav-buttons { display: flex; gap: 8px; }
    .add-card { margin: 16px 24px; }
    .form-row { display: flex; gap: 12px; align-items: center; }
    .data-table { width: calc(100% - 48px); margin: 16px 24px; }
  `]
})
export class AdminClassesComponent implements OnInit {
  displayedColumns = ['classId', 'className', 'actions'];
  classes: any[] = [];
  newClassName = '';

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    console.log(`[AdminClassesComponent] ngOnInit`);
    this.loadClasses();
  }

  loadClasses(): void {
    this.apiService.getClasses().subscribe({
      next: (data) => { this.classes = data; console.log(`[AdminClassesComponent] loaded ${data.length} classes`); },
      error: (err) => console.error(`[AdminClassesComponent] loadClasses failed:`, err)
    });
  }

  addClass(): void {
    if (!this.newClassName) { alert('请输入班级名称'); return; }
    console.log(`[AdminClassesComponent] adding class: ${this.newClassName}`);
    this.apiService.createClass({ className: this.newClassName }).subscribe({
      next: () => {
        console.log(`[AdminClassesComponent] class added`);
        this.newClassName = '';
        this.loadClasses();
      },
      error: (err) => { console.error(`[AdminClassesComponent] addClass failed:`, err); alert('添加失败'); }
    });
  }

  deleteClass(classId: number): void {
    if (!confirm('确定删除？')) return;
    console.log(`[AdminClassesComponent] deleting class: ${classId}`);
    this.apiService.deleteClass(classId).subscribe({
      next: () => { console.log(`[AdminClassesComponent] class deleted`); this.loadClasses(); },
      error: (err) => { console.error(`[AdminClassesComponent] deleteClass failed:`, err); alert('删除失败'); }
    });
  }

  logout(): void { this.authService.logout(); }
}
