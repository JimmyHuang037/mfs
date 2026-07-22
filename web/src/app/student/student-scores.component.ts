import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../auth/auth.service';
import { ApiService } from '@app/core/services/api.service';
import { SUBJECTS } from '@app/models';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-student-scores',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatButtonModule,
    MatButtonToggleModule, MatTableModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">

      <div class="content" *ngIf="!loading; else loadingTmpl">

        <!-- 需求2: 考试类型选择器 -->
        <mat-card class="section exam-selector">
          <mat-card-content>
            <mat-form-field appearance="outline" class="type-select">
              <mat-label>考试类型</mat-label>
              <mat-select [(ngModel)]="selectedType" (selectionChange)="onExamTypeChange()">
                <mat-option *ngFor="let et of examTypes" [value]="et.type">
                  {{ et.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <span class="exam-date-label" *ngIf="selectedExamDate">
              考试日期: {{ selectedExamDate }}
            </span>
          </mat-card-content>
        </mat-card>

        <!-- 需求3: 成绩总览 -->
        <mat-card class="section overview" *ngIf="overview">
          <mat-card-header>
            <mat-card-title>成绩总览</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="overview-grid">
              <div class="overview-item">
                <span class="label">总分</span>
                <span class="value highlight">{{ overview.totalScore }}</span>
              </div>
              <div class="overview-item">
                <span class="label">班级排名</span>
                <span class="value">{{ overview.classRank }} / {{ overview.classTotal }}</span>
              </div>
              <div class="overview-item">
                <span class="label">年级排名</span>
                <span class="value">{{ overview.gradeRank }} / {{ overview.gradeTotal }}</span>
              </div>
              <div class="overview-item">
                <span class="label">等级</span>
                <span class="value badge" [ngClass]="'level-' + (overview.level || '').toLowerCase()">
                  {{ overview.level }}
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- 需求4: 成绩明细 -->
        <mat-card class="section details" *ngIf="details">
          <mat-card-header>
            <mat-card-title>成绩明细</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="details.subjects" class="full-width">
              <ng-container matColumnDef="subject">
                <th mat-header-cell *matHeaderCellDef>科目</th>
                <td mat-cell *matCellDef="let row">{{ row.subject }}</td>
              </ng-container>
              <ng-container matColumnDef="score">
                <th mat-header-cell *matHeaderCellDef>我的分数</th>
                <td mat-cell *matCellDef="let row">
                  <span class="score-val">{{ row.rawScore }}</span>
                  <span class="assigned-badge" *ngIf="row.assignedScore != null">
                    → {{ row.assignedScore }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="classAvg">
                <th mat-header-cell *matHeaderCellDef>班级平均</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.classAvgRaw }}
                  <span class="assigned-sub" *ngIf="row.classAvgAssigned != null">
                    (赋分 {{ row.classAvgAssigned }})
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="gradeAvg">
                <th mat-header-cell *matHeaderCellDef>年级平均</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.gradeAvgRaw }}
                  <span class="assigned-sub" *ngIf="row.gradeAvgAssigned != null">
                    (赋分 {{ row.gradeAvgAssigned }})
                  </span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="detailColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: detailColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- 需求5: 分数段直方图 -->
        <mat-card class="section histogram-card" *ngIf="segmentStats">
          <mat-card-header>
            <mat-card-title>分数段统计</mat-card-title>
            <mat-button-toggle-group
              class="dimension-toggle"
              [(ngModel)]="segmentDimension"
              (change)="loadSegmentStats()">
              <mat-button-toggle value="class">班级</mat-button-toggle>
              <mat-button-toggle value="grade">年级</mat-button-toggle>
            </mat-button-toggle-group>
          </mat-card-header>
          <mat-card-content>
            <div class="histogram">
              <div class="bar-wrapper" *ngFor="let seg of segmentStats.segments">
                <div class="bar-label">{{ seg.range }}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.height.%]="seg.percentage * 2.5"
                    [class.active]="seg.isStudentSegment"
                    [title]="seg.count + '人'">
                  </div>
                </div>
                <div class="bar-count">{{ seg.count }}人</div>
              </div>
            </div>
            <div class="segment-legend">
              共 {{ segmentStats.totalStudents }} 人 |
              你的总分: {{ segmentStats.studentTotal }} |
              所在段: <strong>{{ segmentStats.studentSegment }}</strong>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- 需求6: 单科前三 + 总分前十 -->
        <mat-card class="section top-students" *ngIf="topStudents">
          <mat-card-header>
            <mat-card-title>年级排名</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="top-grid">
              <!-- 单科前三 -->
              <div class="top-subject" *ngFor="let subj of subjects">
                <h4>{{ subj }} 前三名</h4>
                <div class="top-list">
                  <div class="top-item" *ngFor="let s of topStudents.subjectTops[subj]">
                    <span class="medal" [ngClass]="'rank-' + s.rank">
                      {{ s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : '🥉' }}
                    </span>
                    <span class="top-name">{{ s.name }}</span>
                    <span class="top-score">{{ s.score }}分</span>
                  </div>
                </div>
              </div>
            </div>

            <mat-divider class="top-divider"></mat-divider>

            <div class="overall-top">
              <h3>总分年级前十</h3>
              <table mat-table [dataSource]="topStudents.overallTop10" class="full-width">
                <ng-container matColumnDef="rank">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let row; let i = index">{{ row.rank }}</td>
                </ng-container>
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>姓名</th>
                  <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                </ng-container>
                <ng-container matColumnDef="total">
                  <th mat-header-cell *matHeaderCellDef>总分</th>
                  <td mat-cell *matCellDef="let row"><strong>{{ row.total }}</strong></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="topColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: topColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>

      </div>

      <ng-template #loadingTmpl>
        <div class="loading">加载中...</div>
      </ng-template>

      <div class="error-banner" *ngIf="errorMessage">
        ⚠️ {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 960px; margin: 0 auto; padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section { margin-bottom: 20px; }
    .loading { text-align: center; padding: 48px; color: #666; font-size: 16px; }
    .error-banner { background: #fce4ec; color: #c62828; padding: 12px 16px; margin-bottom: 16px; border-radius: 8px; font-size: 14px; }

    /* 考试类型选择器 */
    .exam-selector .mat-card-content { display: flex; align-items: center; gap: 16px; }
    .type-select { width: 240px; }
    .exam-date-label { color: #666; font-size: 14px; }

    /* 成绩总览 */
    .overview-grid { display: flex; gap: 24px; flex-wrap: wrap; }
    .overview-item { display: flex; flex-direction: column; align-items: center; min-width: 120px; }
    .overview-item .label { font-size: 13px; color: #666; margin-bottom: 4px; }
    .overview-item .value { font-size: 24px; font-weight: 700; }
    .overview-item .highlight { color: #1976d2; }
    .badge { padding: 4px 12px; border-radius: 12px; font-size: 18px !important; }
    .level-a { background: #e8f5e9; color: #2e7d32; }
    .level-b { background: #e3f2fd; color: #1565c0; }
    .level-c { background: #fff3e0; color: #e65100; }
    .level-d { background: #fce4ec; color: #c62828; }
    .level-e { background: #f3e5f5; color: #7b1fa2; }

    /* 成绩明细表格 */
    .full-width { width: 100%; }
    .score-val { font-weight: 600; color: #1976d2; }
    .assigned-badge { margin-left: 6px; font-size: 12px; color: #e65100; font-weight: 600; }
    .assigned-sub { display: block; font-size: 11px; color: #e65100; margin-top: 2px; }

    /* 直方图 */
    .histogram-card .mat-card-header { display: flex; align-items: center; }
    .dimension-toggle { margin-left: auto; }
    .histogram { display: flex; align-items: flex-end; gap: 8px; height: 240px; padding: 16px 0; }
    .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .bar-track { flex: 1; width: 100%; display: flex; flex-direction: column-reverse; align-items: center; }
    .bar-fill { width: 60%; min-height: 4px; background: #90caf9; border-radius: 4px 4px 0 0; transition: height 0.3s; }
    .bar-fill.active { background: #f44336; width: 80%; }
    .bar-count { font-size: 11px; color: #666; margin-top: 4px; }
    .segment-legend { text-align: center; font-size: 13px; color: #555; padding: 8px 0; }

    /* 年级排名 */
    .top-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .top-subject h4 { margin: 0 0 8px 0; font-size: 14px; color: #333; }
    .top-list { display: flex; flex-direction: column; gap: 4px; }
    .top-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .medal { font-size: 16px; }
    .top-name { flex: 1; }
    .top-score { color: #666; }
    .top-divider { margin: 16px 0; }
    .overall-top h3 { margin: 0 0 12px 0; }
    @media (max-width: 600px) { .top-grid { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class StudentScoresComponent implements OnInit {
  studentName = '';

  // 学生信息
  studentId = '';
  classId = 0;

  // 考试类型
  examTypes: any[] = [];
  selectedType = '';
  selectedExamDate = '';

  // 各数据
  overview: any = null;
  details: any = null;
  segmentStats: any = null;
  topStudents: any = null;

  loading = true;

  // 配置
  subjects = SUBJECTS;
  detailColumns = ['subject', 'score', 'classAvg', 'gradeAvg'];
  topColumns = ['rank', 'name', 'total'];
  segmentDimension = 'class';

  // 异步竞态标记
  private _loadVersion = 0;
  // 错误提示
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('[StudentScoresComponent] ngOnInit');
    const student = this.authService.getStudent();
    if (!student) {
      console.warn('[StudentScoresComponent] no student logged in');
      this.loading = false;
      return;
    }
    this.studentName = student.name;
    this.studentId = student.studentId;
    this.classId = student.classId || 0;
    console.log(`[StudentScoresComponent] student=${this.studentName}, id=${this.studentId}, class=${this.classId}`);

    await this.loadExamTypes();
    this.loading = false;
  }

  async loadExamTypes(): Promise<void> {
    try {
      const res = await lastValueFrom(this.apiService.getExamTypes(this.studentId));
      this.examTypes = res.examTypes || [];
      console.log(`[StudentScoresComponent] loaded ${this.examTypes.length} exam types`);
      if (this.examTypes.length > 0) {
        this.selectedType = this.examTypes[0].type;
        this.selectedExamDate = this.examTypes[0].latestDate;
        await this.loadAllData();
      }
    } catch (err) {
      console.error('[StudentScoresComponent] loadExamTypes failed:', err);
    }
  }

  async onExamTypeChange(): Promise<void> {
    const et = this.examTypes.find(e => e.type === this.selectedType);
    this.selectedExamDate = et ? et.latestDate : '';
    console.log(`[StudentScoresComponent] exam type changed: ${this.selectedType}, date=${this.selectedExamDate}`);
    this.errorMessage = '';
    await this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    if (!this.selectedType || !this.selectedExamDate) return;
    const version = ++this._loadVersion;
    await Promise.all([
      this.loadOverview(version),
      this.loadDetails(version),
      this.loadSegmentStats(version),
      this.loadTopStudents(version),
    ]);
  }

  async loadOverview(version?: number): Promise<void> {
    try {
      const data = await lastValueFrom(
        this.apiService.getScoreOverview(this.studentId, this.selectedType, this.selectedExamDate)
      );
      if (version !== undefined && version !== this._loadVersion) return; // 过期丢弃
      this.overview = data;
      console.log('[StudentScoresComponent] overview loaded:', this.overview);
    } catch (err) {
      if (version === undefined || version === this._loadVersion) {
        this.errorMessage = '加载成绩概览失败，请稍后重试';
      }
      console.error('[StudentScoresComponent] loadOverview failed:', err);
    }
  }

  async loadDetails(version?: number): Promise<void> {
    try {
      const data = await lastValueFrom(
        this.apiService.getScoreDetails(this.studentId, this.selectedType, this.selectedExamDate)
      );
      if (version !== undefined && version !== this._loadVersion) return;
      this.details = data;
      console.log('[StudentScoresComponent] details loaded');
    } catch (err) {
      if (version === undefined || version === this._loadVersion) {
        this.errorMessage = '加载成绩明细失败，请稍后重试';
      }
      console.error('[StudentScoresComponent] loadDetails failed:', err);
    }
  }

  async loadSegmentStats(version?: number): Promise<void> {
    try {
      const data = await lastValueFrom(
        this.apiService.getSegmentStats(
          this.selectedType, this.selectedExamDate,
          this.segmentDimension, this.classId, this.studentId
        )
      );
      if (version !== undefined && version !== this._loadVersion) return;
      this.segmentStats = data;
      console.log('[StudentScoresComponent] segment stats loaded, dimension=' + this.segmentDimension);
    } catch (err) {
      if (version === undefined || version === this._loadVersion) {
        this.errorMessage = '加载分数段统计失败，请稍后重试';
      }
      console.error('[StudentScoresComponent] loadSegmentStats failed:', err);
    }
  }

  async loadTopStudents(version?: number): Promise<void> {
    try {
      const data = await lastValueFrom(
        this.apiService.getTopStudents(this.selectedType, this.selectedExamDate)
      );
      if (version !== undefined && version !== this._loadVersion) return;
      this.topStudents = data;
      console.log('[StudentScoresComponent] top students loaded');
    } catch (err) {
      if (version === undefined || version === this._loadVersion) {
        this.errorMessage = '加载年级排名失败，请稍后重试';
      }
      console.error('[StudentScoresComponent] loadTopStudents failed:', err);
    }
  }

  logout(): void {
    console.log('[StudentScoresComponent] logout');
    this.authService.logout();
  }
}