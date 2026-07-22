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
  selector: 'app-admin-scores',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatInputModule, MatCardModule],
  template: `
    <div class="header">
      <h2>成绩管理</h2>
      <div class="nav-buttons">
        <a mat-raised-button routerLink="/admin/students">学生</a>
        <a mat-raised-button routerLink="/admin/teachers">老师</a>
        <a mat-raised-button routerLink="/admin/classes">班级</a>
        <button mat-raised-button color="warn" (click)="logout()">登出</button>
      </div>
    </div>
    <mat-card class="add-card">
      <mat-card-header><mat-card-title>添加成绩</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="form-row">
          <mat-form-field appearance="outline"><mat-label>学号</mat-label><input matInput [(ngModel)]="newScore.studentId"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>科目</mat-label><input matInput [(ngModel)]="newScore.subject"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>类型</mat-label><input matInput [(ngModel)]="newScore.type" placeholder="Final/月考/期中"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>分数</mat-label><input matInput type="number" [(ngModel)]="newScore.score"></mat-form-field>
          <button mat-raised-button color="primary" (click)="addScore()">添加</button>
        </div>
      </mat-card-content>
    </mat-card>
    <table mat-table [dataSource]="scores" class="mat-elevation-z8 data-table">
      <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>ID</th><td mat-cell *matCellDef="let r">{{r.id}}</td></ng-container>
      <ng-container matColumnDef="studentId"><th mat-header-cell *matHeaderCellDef>学号</th><td mat-cell *matCellDef="let r">{{r.studentId}}</td></ng-container>
      <ng-container matColumnDef="subject"><th mat-header-cell *matHeaderCellDef>科目</th><td mat-cell *matCellDef="let r">{{r.subject}}</td></ng-container>
      <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>类型</th><td mat-cell *matCellDef="let r">{{r.type}}</td></ng-container>
      <ng-container matColumnDef="score"><th mat-header-cell *matHeaderCellDef>成绩</th><td mat-cell *matCellDef="let r">{{r.score}}</td></ng-container>
      <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>操作</th><td mat-cell *matCellDef="let r"><button mat-button color="warn" (click)="deleteScore(r.id)">删除</button></td></ng-container>
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
export class AdminScoresComponent implements OnInit {
  displayedColumns = ['id', 'studentId', 'subject', 'type', 'score', 'actions'];
  scores: any[] = [];
  newScore = { studentId: '', subject: '', type: 'Final', score: 0 };

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    console.log(`[AdminScoresComponent] ngOnInit`);
    this.loadScores();
  }

  loadScores(): void {
    this.apiService.getAllScores().subscribe({
      next: (data) => { this.scores = data; console.log(`[AdminScoresComponent] loaded ${data.length} scores`); },
      error: (err) => console.error(`[AdminScoresComponent] loadScores failed:`, err)
    });
  }

  addScore(): void {
    if (!this.newScore.studentId || !this.newScore.subject || !this.newScore.score) {
      alert('请填写完整信息'); return;
    }
    console.log(`[AdminScoresComponent] adding score for student: ${this.newScore.studentId}`);
    this.apiService.addScore(this.newScore).subscribe({
      next: () => {
        console.log(`[AdminScoresComponent] score added`);
        this.newScore = { studentId: '', subject: '', type: 'Final', score: 0 };
        this.loadScores();
      },
      error: (err) => { console.error(`[AdminScoresComponent] addScore failed:`, err); alert('添加失败'); }
    });
  }

  deleteScore(scoreId: number): void {
    if (!confirm('确定删除？')) return;
    console.log(`[AdminScoresComponent] deleting score: ${scoreId}`);
    this.apiService.deleteScore(scoreId).subscribe({
      next: () => { console.log(`[AdminScoresComponent] score deleted`); this.loadScores(); },
      error: (err) => { console.error(`[AdminScoresComponent] deleteScore failed:`, err); alert('删除失败'); }
    });
  }

  logout(): void { this.authService.logout(); }
}
