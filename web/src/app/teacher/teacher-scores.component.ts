import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@app/core/services/api.service';
import { AuthService } from '@app/auth/auth.service';

const EXAM_TYPES = [
  { value: 'monthly1', label: '月考1' },
  { value: 'monthly2', label: '月考2' },
  { value: 'midterm', label: '期中' },
  { value: 'final', label: '期末' },
];

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '政治'];

@Component({
  selector: 'app-teacher-scores',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule,
    MatInputModule, MatSelectModule, MatCardModule, MatTabsModule, MatIconModule,
  ],
  template: `
    <div class="header">
      <h2>{{ teacherName }} ({{ subject }})</h2>
      <button mat-raised-button color="warn" (click)="logout()">登出</button>
    </div>

    <mat-tab-group (selectedTabChange)="onTabChange($event.index)">
      <!-- Tab 1: 成绩管理 -->
      <mat-tab label="成绩管理">
        <div class="tab-content">
          <!-- 班级筛选 -->
          <mat-card class="filter-card">
            <mat-form-field appearance="outline">
              <mat-label>选择班级</mat-label>
              <mat-select [(value)]="selectedClassId" (selectionChange)="onClassChange()">
                <mat-option *ngFor="let cls of classes" [value]="cls.classId">
                  {{ cls.className }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card>

          <!-- 添加成绩 -->
          <mat-card class="add-card">
            <mat-card-header><mat-card-title>添加成绩</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>学号</mat-label>
                  <input matInput [(ngModel)]="newScore.studentId" (blur)="onStudentIdBlur()">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>科目</mat-label>
                  <mat-select [(value)]="newScore.subject">
                    <mat-option *ngFor="let s of subjects" [value]="s">{{ s }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>考试类型</mat-label>
                  <mat-select [(value)]="newScore.type">
                    <mat-option *ngFor="let t of examTypes" [value]="t.value">{{ t.label }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>分数</mat-label>
                  <input matInput type="number" step="0.5" min="0" max="150" [(ngModel)]="newScore.score">
                </mat-form-field>
                <mat-form-field appearance="outline" *ngIf="newScore.autoClass">
                  <mat-label>班级(自动)</mat-label>
                  <input matInput [value]="newScore.autoClass" disabled>
                </mat-form-field>
                <button mat-raised-button color="primary" (click)="addScore()">添加</button>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- xlsx 导入 -->
          <mat-card class="import-card">
            <mat-card-header><mat-card-title>Excel 导入</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="import-row">
                <input type="file" accept=".xlsx,.xls" (change)="onFileSelected($event)" #fileInput>
                <button mat-raised-button color="accent" (click)="uploadXlsx()" [disabled]="!selectedFile">
                  上传导入
                </button>
              </div>
              <div *ngIf="importResult" class="import-result">
                <span class="success">成功: {{ importResult.success }} 条</span>
                <span class="failed"> | 失败: {{ importResult.failed }} 条</span>
                <div *ngIf="importResult.errors?.length" class="errors">
                  <div *ngFor="let err of importResult.errors.slice(0, 5)">{{ err }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 成绩表格 -->
          <table mat-table [dataSource]="scores" class="mat-elevation-z8 scores-table" *ngIf="scores.length > 0">
            <ng-container matColumnDef="studentId">
              <th mat-header-cell *matHeaderCellDef>学号</th>
              <td mat-cell *matCellDef="let row">{{ row.studentId }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>姓名</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="subject">
              <th mat-header-cell *matHeaderCellDef>科目</th>
              <td mat-cell *matCellDef="let row">
                <input class="inline-edit" [value]="row.subject"
                  (blur)="onInlineEdit(row, 'subject', $event)"
                  (keydown.enter)="onInlineEdit(row, 'subject', $event)">
              </td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>类型</th>
              <td mat-cell *matCellDef="let row">
                <input class="inline-edit" [value]="row.type"
                  (blur)="onInlineEdit(row, 'type', $event)"
                  (keydown.enter)="onInlineEdit(row, 'type', $event)">
              </td>
            </ng-container>
            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>成绩</th>
              <td mat-cell *matCellDef="let row">
                <input class="inline-edit score-input" type="number" step="0.5" [value]="row.score"
                  (blur)="onInlineEdit(row, 'score', $event)"
                  (keydown.enter)="onInlineEdit(row, 'score', $event)">
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>操作</th>
              <td mat-cell *matCellDef="let row">
                <button mat-button color="warn" (click)="deleteScore(row.id)">删除</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <div *ngIf="scores.length === 0 && selectedClassId" class="empty-msg">该班暂无成绩数据</div>
        </div>
      </mat-tab>

      <!-- Tab 2: 班级统计 -->
      <mat-tab label="班级统计">
        <div class="tab-content">
          <mat-card class="filter-card">
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>考试类型</mat-label>
                <mat-select [(value)]="statsExamType" (selectionChange)="loadAllStats()">
                  <mat-option *ngFor="let t of examTypes" [value]="t.value">{{ t.label }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>班级</mat-label>
                <mat-select [(value)]="statsClassId" (selectionChange)="loadSegmentsAndTop3()">
                  <mat-option *ngFor="let cls of classes" [value]="cls.classId">{{ cls.className }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card>

          <!-- 班级总分排名柱状图 -->
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>班级总分平均分排名</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="vertical-bar-chart" *ngIf="classRankData.length > 0">
                <div class="bar-item" *ngFor="let item of classRankData">
                  <div class="bar-value">{{ item.avgTotal }}</div>
                  <div class="bar-track-vertical">
                    <div class="bar-fill-vertical"
                      [style.height.%]="getBarHeight(item.avgTotal, classRankMax)">
                    </div>
                  </div>
                  <div class="bar-name">{{ item.className }}</div>
                  <div class="bar-rank">#{{ item.rank }}</div>
                </div>
              </div>
              <div *ngIf="classRankData.length === 0" class="empty-msg">请选择考试类型查看排名</div>
            </mat-card-content>
          </mat-card>

          <!-- 分数段分布 -->
          <mat-card class="chart-card" *ngIf="segmentData">
            <mat-card-header>
              <mat-card-title>{{ segmentData.subject }} 分数段分布</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="histogram">
                <div class="bar-wrapper" *ngFor="let seg of segmentData.segments">
                  <div class="bar-count">{{ seg.count }}人</div>
                  <div class="bar-track">
                    <div class="bar-fill"
                      [style.height.%]="seg.percentage * 2.5"
                      [title]="seg.count + '人 (' + seg.percentage + '%)'">
                    </div>
                  </div>
                  <div class="bar-label">{{ seg.range }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 单科前三 -->
          <mat-card class="chart-card" *ngIf="top3Data">
            <mat-card-header><mat-card-title>各科前三名</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="top-grid">
                <div class="top-subject" *ngFor="let subj of subjects">
                  <h4>
                    {{ subj }}
                    <span class="not-my-subject" *ngIf="subj !== subject">(非本人任教)</span>
                  </h4>
                  <div class="top-list">
                    <div class="top-item" *ngFor="let t of top3Data[subj]">
                      <span class="medal">{{ getMedal(t.rank) }}</span>
                      <span class="top-name">{{ t.name }}</span>
                      <span class="top-score">{{ t.score }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-tab>

      <!-- Tab 3: 同科对比 -->
      <mat-tab label="同科对比">
        <div class="tab-content">
          <mat-card class="filter-card">
            <mat-form-field appearance="outline">
              <mat-label>考试类型</mat-label>
              <mat-select [(value)]="compareExamType" (selectionChange)="loadTeacherCompare()">
                <mat-option *ngFor="let t of examTypes" [value]="t.value">{{ t.label }}</mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card>

          <mat-card class="chart-card" *ngIf="compareData">
            <mat-card-header>
              <mat-card-title>{{ compareData.subject }} — 同科老师班级平均分对比</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="horizontal-bar-chart">
                <div class="h-bar-item" *ngFor="let t of compareData.teachers">
                  <div class="h-bar-name" [class.current]="t.isCurrent">{{ t.teacherName }}</div>
                  <div class="h-bar-track">
                    <div class="h-bar-fill"
                      [class.current]="t.isCurrent"
                      [style.width.%]="getHBarWidth(t.avgScore)">
                    </div>
                  </div>
                  <div class="h-bar-value">{{ t.avgScore }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
          <div *ngIf="!compareData" class="empty-msg">请选择考试类型查看对比</div>
        </div>
      </mat-tab>

      <!-- Tab 4: 学情分析 -->
      <mat-tab label="学情分析">
        <div class="tab-content">
          <!-- 班级筛选 -->
          <mat-card class="filter-card">
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>选择班级</mat-label>
                <mat-select [(value)]="analysisClassId" (selectionChange)="filterAnalysisByClass()">
                  <mat-option *ngFor="let cls of classes" [value]="cls.classId">{{ cls.className }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>分类筛选</mat-label>
                <mat-select [(value)]="analysisFilter" (selectionChange)="filterAnalysisByClass()" multiple>
                  <mat-option *ngFor="let f of analysisFilters" [value]="f.value">{{ f.label }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card>

          <!-- 概况卡片 -->
          <div class="summary-cards" *ngIf="analysisData">
            <div class="summary-card total">
              <div class="s-num">{{ analysisData.summary.totalStudents }}</div>
              <div class="s-label">总人数</div>
            </div>
            <div class="summary-card gifted" (click)="toggleFilter('天才型')">
              <div class="s-num">{{ analysisData.summary.gifted }}</div>
              <div class="s-label">天才型</div>
            </div>
            <div class="summary-card potential" (click)="toggleFilter('潜力型')">
              <div class="s-num">{{ analysisData.summary.potential }}</div>
              <div class="s-label">潜力型</div>
            </div>
            <div class="summary-card motivated" (click)="toggleFilter('上进型')">
              <div class="s-num">{{ analysisData.summary.motivated }}</div>
              <div class="s-label">上进型</div>
            </div>
            <div class="summary-card declining" (click)="toggleFilter('下滑型')">
              <div class="s-num">{{ analysisData.summary.declining }}</div>
              <div class="s-label">下滑型</div>
            </div>
            <div class="summary-card giving-up" (click)="toggleFilter('摆烂型')">
              <div class="s-num">{{ analysisData.summary.giving_up }}</div>
              <div class="s-label">摆烂型</div>
            </div>
          </div>

          <!-- 四象限散点图 -->
          <mat-card class="chart-card" *ngIf="analysisStudents.length > 0">
            <mat-card-header>
              <mat-card-title>能力值-趋势 四象限散点图</mat-card-title>
              <mat-card-subtitle>X轴: 能力值(归一化0-100) | Y轴: 趋势(进步/退步) | 点击查看轨迹</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="scatter-plot">
                <!-- 象限分割线 -->
                <div class="quadrant-line v-line"></div>
                <div class="quadrant-line h-line"></div>
                <!-- 象限标签 -->
                <div class="quadrant-label tl">上进型<br><small>低能力·进步</small></div>
                <div class="quadrant-label tr">天才型<br><small>高能力·进步</small></div>
                <div class="quadrant-label bl">摆烂型<br><small>低能力·退步</small></div>
                <div class="quadrant-label br">下滑型<br><small>高能力·退步</small></div>
                <!-- 数据点 -->
                <div class="dot"
                  *ngFor="let s of displayedStudents"
                  [class.selected]="selectedStudentId === s.studentId"
                  [style.left.%]="getDotX(s.ability)"
                  [style.top.%]="getDotY(s.trend)"
                  [style.background]="getClassificationColor(s.classification)"
                  [style.width.px]="getDotSize(s.volatility)"
                  [style.height.px]="getDotSize(s.volatility)"
                  [title]="s.name + ' (' + s.classification + ')'"
                  (click)="selectStudent(s)">
                  <span class="dot-label">{{ s.name }}</span>
                </div>
                <!-- X轴标签 -->
                <div class="axis-label x-left">0</div>
                <div class="axis-label x-center">50</div>
                <div class="axis-label x-right">100</div>
                <div class="axis-label y-top">进步</div>
                <div class="axis-label y-bottom">退步</div>
              </div>
              <!-- 图例 -->
              <div class="scatter-legend">
                <span class="legend-item" *ngFor="let c of classificationColors">
                  <span class="legend-dot" [style.background]="c.color"></span>
                  {{ c.label }}
                </span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 重点关注列表 -->
          <mat-card class="chart-card" *ngIf="analysisStudents.length > 0">
            <mat-card-header>
              <mat-card-title>学生状态列表</mat-card-title>
              <mat-card-subtitle>按需关注程度排序，点击学生查看成绩轨迹</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <table class="analysis-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>能力值</th>
                    <th>趋势</th>
                    <th>波动</th>
                    <th>分类</th>
                    <th>建议</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of analysisStudents"
                    [class.selected]="selectedStudentId === s.studentId"
                    [class.high-attention]="s.attentionLevel === 'high'"
                    (click)="selectStudent(s)">
                    <td class="cell-name">{{ s.name }}</td>
                    <td>{{ s.ability }}</td>
                    <td>
                      <span [class.trend-up]="s.trend > 0.5"
                        [class.trend-down]="s.trend < -0.5"
                        [class.trend-flat]="s.trend >= -0.5 && s.trend <= 0.5">
                        {{ s.trend > 0 ? '+' : '' }}{{ s.trend }}
                      </span>
                    </td>
                    <td>{{ s.volatility }}</td>
                    <td>
                      <span class="classif-badge" [style.background]="getClassificationColor(s.classification)">
                        {{ s.classification }}
                      </span>
                    </td>
                    <td class="cell-desc">{{ s.description }}</td>
                  </tr>
                </tbody>
              </table>
            </mat-card-content>
          </mat-card>
          <div *ngIf="!analysisData" class="empty-msg">加载中...</div>
          <div *ngIf="analysisData && analysisStudents.length === 0" class="empty-msg">该班级暂无分析数据</div>

          <!-- 学生轨迹卡片 (点击学生后弹出) -->
          <mat-card class="chart-card trajectory-card" *ngIf="trajectoryData">
            <mat-card-header>
              <mat-card-title>{{ trajectoryData.name }} — {{ trajectoryData.subject }} 成绩轨迹</mat-card-title>
              <button mat-button color="warn" (click)="closeTrajectory()">✕ 关闭</button>
            </mat-card-header>
            <mat-card-content>
              <div class="trajectory-chart">
                <div class="traj-item" *ngFor="let t of trajectoryData.trajectory; let i = index">
                  <div class="traj-label">{{ getExamTypeLabel(t.type) }}</div>
                  <div class="traj-bars">
                    <div class="traj-bar-row">
                      <div class="traj-bar-label">学生</div>
                      <div class="traj-bar-track">
                        <div class="traj-bar student"
                          [style.width.%]="getTrajBarWidth(t.score)"
                          [title]="'学生: ' + t.score">
                          {{ t.score }}
                        </div>
                      </div>
                    </div>
                    <div class="traj-bar-row">
                      <div class="traj-bar-label">班级</div>
                      <div class="traj-bar-track">
                        <div class="traj-bar class-avg"
                          [style.width.%]="getTrajBarWidth(t.classAvg)"
                          [title]="'班级平均: ' + t.classAvg">
                          {{ t.classAvg }}
                        </div>
                      </div>
                    </div>
                    <div class="traj-bar-row">
                      <div class="traj-bar-label">年级</div>
                      <div class="traj-bar-track">
                        <div class="traj-bar grade-avg"
                          [style.width.%]="getTrajBarWidth(t.gradeAvg)"
                          [title]="'年级平均: ' + t.gradeAvg">
                          {{ t.gradeAvg }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; }
    .tab-content { padding: 16px 24px; }
    .filter-card { margin-bottom: 16px; }
    .filter-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .add-card { margin-bottom: 16px; }
    .form-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .import-card { margin-bottom: 16px; }
    .import-row { display: flex; gap: 12px; align-items: center; }
    .import-result { margin-top: 12px; font-size: 14px; }
    .import-result .success { color: #4caf50; font-weight: 600; }
    .import-result .failed { color: #f44336; }
    .import-result .errors { margin-top: 4px; font-size: 12px; color: #999; }
    .scores-table { width: 100%; margin-bottom: 16px; }
    .inline-edit { border: 1px solid transparent; padding: 4px 8px; width: 80px; font-size: 14px; background: transparent; }
    .inline-edit:hover { border-color: #ccc; }
    .inline-edit:focus { border-color: #1976d2; outline: none; background: #fff; }
    .score-input { width: 60px; }
    .empty-msg { text-align: center; color: #999; padding: 32px; font-size: 14px; }
    .chart-card { margin-bottom: 16px; }

    /* 垂直柱状图（班级排名） */
    .vertical-bar-chart { display: flex; align-items: flex-end; gap: 24px; height: 260px; padding: 16px 0; justify-content: center; }
    .bar-item { display: flex; flex-direction: column; align-items: center; width: 80px; }
    .bar-value { font-size: 13px; font-weight: 600; color: #1976d2; margin-bottom: 4px; }
    .bar-track-vertical { width: 50px; height: 180px; display: flex; flex-direction: column-reverse; align-items: center; }
    .bar-fill-vertical { width: 100%; background: #42a5f5; border-radius: 4px 4px 0 0; transition: height 0.3s; min-height: 4px; }
    .bar-name { font-size: 13px; color: #333; margin-top: 6px; text-align: center; }
    .bar-rank { font-size: 12px; color: #999; }

    /* 直方图（分数段） */
    .histogram { display: flex; align-items: flex-end; gap: 8px; height: 240px; padding: 16px 0; }
    .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-label { font-size: 11px; color: #666; margin-top: 4px; }
    .bar-track { flex: 1; width: 100%; display: flex; flex-direction: column-reverse; align-items: center; }
    .bar-fill { width: 60%; min-height: 4px; background: #90caf9; border-radius: 4px 4px 0 0; transition: height 0.3s; }
    .bar-count { font-size: 11px; color: #666; margin-bottom: 4px; }

    /* 单科前三 */
    .top-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .top-subject h4 { margin: 0 0 8px 0; font-size: 14px; color: #333; }
    .not-my-subject { font-size: 10px; color: #999; font-weight: 400; }
    .top-list { display: flex; flex-direction: column; gap: 4px; }
    .top-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .medal { font-size: 16px; }
    .top-name { flex: 1; }
    .top-score { color: #666; }

    /* 横向柱状图（同科对比） */
    .horizontal-bar-chart { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; }
    .h-bar-item { display: flex; align-items: center; gap: 12px; }
    .h-bar-name { width: 80px; text-align: right; font-size: 14px; color: #333; }
    .h-bar-name.current { font-weight: 700; color: #1976d2; }
    .h-bar-track { flex: 1; height: 32px; background: #eee; border-radius: 4px; overflow: hidden; }
    .h-bar-fill { height: 100%; background: #90caf9; border-radius: 4px; transition: width 0.3s; }
    .h-bar-fill.current { background: #1976d2; }
    .h-bar-value { width: 50px; font-size: 14px; font-weight: 600; color: #333; }

    /* 学情分析 - 概况卡片 */
    .summary-cards { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-card { padding: 12px 20px; border-radius: 8px; text-align: center; cursor: pointer; min-width: 80px; transition: transform 0.15s; }
    .summary-card:hover { transform: translateY(-2px); }
    .summary-card .s-num { font-size: 28px; font-weight: 700; }
    .summary-card .s-label { font-size: 12px; margin-top: 2px; }
    .summary-card.total { background: #e3f2fd; color: #1565c0; }
    .summary-card.gifted { background: #e8f5e9; color: #2e7d32; }
    .summary-card.potential { background: #fff3e0; color: #e65100; }
    .summary-card.motivated { background: #e3f2fd; color: #1565c0; }
    .summary-card.declining { background: #ffebee; color: #c62828; }
    .summary-card.giving-up { background: #f5f5f5; color: #616161; }

    /* 四象限散点图 */
    .scatter-plot { position: relative; width: 100%; height: 360px; border: 1px solid #e0e0e0; border-radius: 4px; margin: 8px 0; overflow: visible; }
    .quadrant-line.v-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #e0e0e0; z-index: 1; }
    .quadrant-line.h-line { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: #e0e0e0; z-index: 1; }
    .quadrant-label { position: absolute; font-size: 11px; color: #bbb; text-align: center; z-index: 1; pointer-events: none; }
    .quadrant-label small { font-size: 10px; }
    .quadrant-label.tl { top: 8px; left: 8px; }
    .quadrant-label.tr { top: 8px; right: 8px; }
    .quadrant-label.bl { bottom: 8px; left: 8px; }
    .quadrant-label.br { bottom: 8px; right: 8px; }
    .dot { position: absolute; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); cursor: pointer; z-index: 2; transform: translate(-50%, -50%); transition: transform 0.15s, border-color 0.15s; }
    .dot:hover { transform: translate(-50%, -50%) scale(1.3); z-index: 10; }
    .dot.selected { border-color: #000; transform: translate(-50%, -50%) scale(1.4); z-index: 10; }
    .dot-label { display: none; position: absolute; left: 50%; top: -20px; transform: translateX(-50%); white-space: nowrap; background: rgba(0,0,0,0.8); color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 11px; z-index: 20; }
    .dot:hover .dot-label { display: block; }
    .axis-label { position: absolute; font-size: 10px; color: #999; }
    .axis-label.x-left { left: 0; bottom: -20px; }
    .axis-label.x-center { left: 50%; bottom: -20px; transform: translateX(-50%); }
    .axis-label.x-right { right: 0; bottom: -20px; }
    .axis-label.y-top { right: -35px; top: 0; }
    .axis-label.y-bottom { right: -35px; bottom: 0; }
    .scatter-legend { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-top: 8px; font-size: 12px; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }

    /* 重点关注列表 */
    .analysis-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .analysis-table th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e0e0e0; color: #666; font-weight: 600; font-size: 12px; }
    .analysis-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    .analysis-table tbody tr { cursor: pointer; transition: background 0.15s; }
    .analysis-table tbody tr:hover { background: #f5f5f5; }
    .analysis-table tbody tr.selected { background: #e3f2fd; }
    .analysis-table tbody tr.high-attention { border-left: 3px solid #ff9800; }
    .analysis-table .cell-name { font-weight: 600; }
    .analysis-table .cell-desc { font-size: 12px; color: #666; }
    .trend-up { color: #4caf50; font-weight: 600; }
    .trend-down { color: #f44336; font-weight: 600; }
    .trend-flat { color: #999; }
    .classif-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; color: #fff; font-size: 11px; font-weight: 600; }

    /* 成绩轨迹 */
    .trajectory-card { margin-top: 16px; border: 2px solid #1976d2; }
    .trajectory-chart { display: flex; gap: 16px; padding: 8px 0; }
    .traj-item { flex: 1; }
    .traj-label { font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px; text-align: center; }
    .traj-bars { display: flex; flex-direction: column; gap: 4px; }
    .traj-bar-row { display: flex; align-items: center; gap: 6px; }
    .traj-bar-label { width: 28px; font-size: 10px; color: #999; text-align: right; }
    .traj-bar-track { flex: 1; height: 22px; background: #f5f5f5; border-radius: 3px; overflow: hidden; }
    .traj-bar { height: 100%; border-radius: 3px; font-size: 10px; color: #fff; padding: 0 6px; display: flex; align-items: center; min-width: 24px; transition: width 0.3s; }
    .traj-bar.student { background: #1976d2; }
    .traj-bar.class-avg { background: #90caf9; }
    .traj-bar.grade-avg { background: #bdbdbd; }
  `],
})
export class TeacherScoresComponent implements OnInit {
  teacherName = '';
  subject = '';
  teacherId = 0;
  classes: any[] = [];
  subjects = SUBJECTS;
  examTypes = EXAM_TYPES;

  // Tab 1
  selectedClassId: number | null = null;
  displayedColumns = ['studentId', 'name', 'subject', 'type', 'score', 'actions'];
  scores: any[] = [];
  newScore = { studentId: '', subject: '', type: 'monthly1', score: 0, autoClass: '' };
  selectedFile: File | null = null;
  importResult: any = null;

  // Tab 2
  statsExamType = 'monthly1';
  statsClassId: number | null = null;
  classRankData: any[] = [];
  classRankMax = 0;
  segmentData: any = null;
  top3Data: any = null;

  // Tab 3
  compareExamType = 'monthly1';
  compareData: any = null;

  // Tab 4: 学情分析
  analysisClassId: number | null = null;
  analysisFilter: string[] = [];
  analysisFilters = [
    { value: '天才型', label: '天才型' },
    { value: '潜力型', label: '潜力型' },
    { value: '上进型', label: '上进型' },
    { value: '下滑型', label: '下滑型' },
    { value: '摆烂型', label: '摆烂型' },
  ];
  analysisData: any = null;
  analysisAllStudents: any[] = [];
  analysisStudents: any[] = [];
  displayedStudents: any[] = [];
  selectedStudentId: string | null = null;
  trajectoryData: any = null;
  classificationColors = [
    { label: '天才型', color: '#4caf50' },
    { label: '潜力型', color: '#ff9800' },
    { label: '上进型', color: '#2196f3' },
    { label: '下滑型', color: '#f44336' },
    { label: '摆烂型', color: '#9e9e9e' },
  ];

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    console.log(`[TeacherScoresComponent] ngOnInit`);
    const teacher = this.authService.getTeacher();
    if (teacher) {
      this.teacherName = teacher.teacherName;
      this.subject = teacher.subject;
      this.teacherId = teacher.teacherId;
      this.classes = (teacher.classes || []).map((c: any) => ({
        classId: c.classId,
        className: c.className,
      }));
      console.log(`[TeacherScoresComponent] teacher=${this.teacherName}, classes=${this.classes.length}`);
      if (this.classes.length > 0) {
        this.selectedClassId = this.classes[0].classId;
        this.statsClassId = this.classes[0].classId;
        this.loadScores();
      }
    }
  }

  onTabChange(index: number): void {
    console.log(`[TeacherScoresComponent] tab changed to ${index}`);
    if (index === 1) {
      this.loadAllStats();
    } else if (index === 2) {
      this.loadTeacherCompare();
    } else if (index === 3) {
      this.loadStudentAnalysis();
    }
  }

  // ===== Tab 1: 成绩管理 =====

  onClassChange(): void {
    console.log(`[TeacherScoresComponent] class changed to ${this.selectedClassId}`);
    this.loadScores();
  }

  loadScores(): void {
    if (!this.selectedClassId) return;
    console.log(`[TeacherScoresComponent] loading scores for class_id=${this.selectedClassId}, subject=${this.subject}`);
    this.apiService.getClassScores(this.selectedClassId).subscribe({
      next: (data) => {
        this.scores = data.filter((s: any) => s.subject === this.subject);
        console.log(`[TeacherScoresComponent] loaded ${this.scores.length} scores (filtered from ${data.length})`);
      },
      error: (err) => console.error(`[TeacherScoresComponent] loadScores failed:`, err),
    });
  }

  onStudentIdBlur(): void {
    if (!this.newScore.studentId) {
      this.newScore.autoClass = '';
      return;
    }
    this.apiService.getStudent(this.newScore.studentId).subscribe({
      next: (student) => {
        if (student) {
          const cls = this.classes.find(c => c.classId === student.classId);
          this.newScore.autoClass = cls ? cls.className : `classId=${student.classId}`;
        } else {
          this.newScore.autoClass = '';
        }
      },
      error: () => { this.newScore.autoClass = ''; },
    });
  }

  addScore(): void {
    if (!this.newScore.studentId || !this.newScore.subject || !this.newScore.type) {
      alert('请填写完整信息');
      return;
    }
    console.log(`[TeacherScoresComponent] adding score: studentId=${this.newScore.studentId}`);
    this.apiService.addScore({
      student_id: this.newScore.studentId,
      subject: this.newScore.subject,
      type: this.newScore.type,
      score: this.newScore.score,
    }).subscribe({
      next: () => {
        console.log(`[TeacherScoresComponent] score added`);
        this.newScore = { studentId: '', subject: this.subject, type: 'monthly1', score: 0, autoClass: '' };
        this.loadScores();
      },
      error: (err) => {
        console.error(`[TeacherScoresComponent] addScore failed:`, err);
        alert('添加失败');
      },
    });
  }

  onInlineEdit(row: any, field: string, event: any): void {
    const newValue = event.target.value;
    if (newValue == row[field]) return;
    const updateData: any = {};
    if (field === 'score') {
      updateData.score = parseFloat(newValue);
    } else {
      updateData[field] = newValue;
    }
    console.log(`[TeacherScoresComponent] inline edit: score_id=${row.id}, ${field}=${newValue}`);
    this.apiService.updateScore(row.id, updateData).subscribe({
      next: () => {
        row[field] = field === 'score' ? parseFloat(newValue) : newValue;
        console.log(`[TeacherScoresComponent] inline edit saved`);
      },
      error: (err) => {
        console.error(`[TeacherScoresComponent] inline edit failed:`, err);
        alert('保存失败');
      },
    });
  }

  deleteScore(scoreId: number): void {
    if (!confirm('确定删除？')) return;
    console.log(`[TeacherScoresComponent] deleting score id=${scoreId}`);
    this.apiService.deleteScore(scoreId).subscribe({
      next: () => {
        console.log(`[TeacherScoresComponent] score deleted`);
        this.loadScores();
      },
      error: (err) => {
        console.error(`[TeacherScoresComponent] deleteScore failed:`, err);
        alert('删除失败');
      },
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] || null;
    this.importResult = null;
  }

  uploadXlsx(): void {
    if (!this.selectedFile) return;
    console.log(`[TeacherScoresComponent] uploading xlsx: ${this.selectedFile.name}`);
    this.apiService.importScoresXlsx(this.selectedFile).subscribe({
      next: (result) => {
        this.importResult = result;
        console.log(`[TeacherScoresComponent] import done: success=${result.success}, failed=${result.failed}`);
        this.loadScores();
      },
      error: (err) => {
        console.error(`[TeacherScoresComponent] uploadXlsx failed:`, err);
        alert('导入失败');
      },
    });
  }

  // ===== Tab 2: 班级统计 =====

  loadAllStats(): void {
    this.loadClassRank();
    this.loadSegmentsAndTop3();
  }

  loadClassRank(): void {
    if (!this.statsExamType) return;
    console.log(`[TeacherScoresComponent] loading class rank: type=${this.statsExamType}`);
    // 使用最新日期
    this.apiService.getClassTotalRank(this.teacherId, this.statsExamType, this.getLatestDate()).subscribe({
      next: (data) => {
        this.classRankData = data;
        this.classRankMax = Math.max(...data.map((d: any) => d.avgTotal), 1);
        console.log(`[TeacherScoresComponent] class rank loaded: ${data.length} classes`);
      },
      error: (err) => console.error(`[TeacherScoresComponent] loadClassRank failed:`, err),
    });
  }

  loadSegmentsAndTop3(): void {
    if (!this.statsClassId || !this.statsExamType) return;
    const date = this.getLatestDate();
    console.log(`[TeacherScoresComponent] loading segments+top3: class=${this.statsClassId}, type=${this.statsExamType}`);

    this.apiService.getSubjectSegments(this.statsClassId, this.teacherId, this.statsExamType, date).subscribe({
      next: (data) => {
        this.segmentData = data;
        console.log(`[TeacherScoresComponent] segments loaded`);
      },
      error: (err) => console.error(`[TeacherScoresComponent] loadSegments failed:`, err),
    });

    this.apiService.getClassTop3(this.statsClassId, this.statsExamType, date).subscribe({
      next: (data) => {
        this.top3Data = data;
        console.log(`[TeacherScoresComponent] top3 loaded`);
      },
      error: (err) => console.error(`[TeacherScoresComponent] loadTop3 failed:`, err),
    });
  }

  getBarHeight(value: number, max: number): number {
    return max > 0 ? (value / max) * 100 : 0;
  }

  getMedal(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
  }

  // ===== Tab 3: 同科对比 =====

  loadTeacherCompare(): void {
    if (!this.compareExamType) return;
    console.log(`[TeacherScoresComponent] loading teacher compare: type=${this.compareExamType}`);
    this.apiService.getSubjectTeacherCompare(this.teacherId, this.compareExamType, this.getLatestDate()).subscribe({
      next: (data) => {
        this.compareData = data;
        console.log(`[TeacherScoresComponent] teacher compare loaded: ${data.teachers?.length} teachers`);
      },
      error: (err) => console.error(`[TeacherScoresComponent] loadTeacherCompare failed:`, err),
    });
  }

  getHBarWidth(value: number): number {
    return Math.min(value, 100);
  }

  // ===== Tab 4: 学情分析 =====

  loadStudentAnalysis(): void {
    console.log(`[TeacherScoresComponent] loadStudentAnalysis: teacher_id=${this.teacherId}`);
    this.apiService.getStudentAnalysis(this.teacherId).subscribe({
      next: (data) => {
        this.analysisData = data;
        console.log(`[TeacherScoresComponent] analysis loaded: ${data.summary?.totalStudents} students`);
        // 汇集所有班级的学生
        this.analysisAllStudents = [];
        for (const cls of data.classes || []) {
          for (const s of cls.students || []) {
            this.analysisAllStudents.push(s);
          }
        }
        // 默认选中第一个班级
        if (this.classes.length > 0 && !this.analysisClassId) {
          this.analysisClassId = this.classes[0].classId;
        }
        this.filterAnalysisByClass();
      },
      error: (err) => {
        console.error(`[TeacherScoresComponent] loadStudentAnalysis failed:`, err);
      },
    });
  }

  filterAnalysisByClass(): void {
    if (!this.analysisClassId) {
      this.analysisStudents = [];
      this.displayedStudents = [];
      this.selectedStudentId = null;
      return;
    }
    // 按班级筛选
    let filtered = this.analysisAllStudents.filter(s => s.classId === this.analysisClassId);
    // 按分类筛选
    if (this.analysisFilter && this.analysisFilter.length > 0) {
      filtered = filtered.filter(s => this.analysisFilter.includes(s.classification));
    }
    this.analysisStudents = filtered;
    this.updateDisplayedStudents();
    this.selectedStudentId = null;
    this.trajectoryData = null;
    console.log(`[TeacherScoresComponent] filtered: ${filtered.length} students`);
  }

  toggleFilter(classification: string): void {
    const idx = this.analysisFilter.indexOf(classification);
    if (idx >= 0) {
      this.analysisFilter.splice(idx, 1);
    } else {
      this.analysisFilter.push(classification);
    }
    this.filterAnalysisByClass();
  }

  updateDisplayedStudents(): void {
    // 散点图最多显示40个点，超出则只显示前40个
    this.displayedStudents = this.analysisStudents.slice(0, 40);
  }

  getDotX(ability: number): number {
    // ability 0-100 → left 0-100%
    return Math.max(2, Math.min(98, ability));
  }

  getDotY(trend: number): number {
    // trend -5 to +5 → top 90% to 10%
    const clamped = Math.max(-5, Math.min(5, trend));
    const pct = 50 - (clamped / 5) * 40;
    return Math.max(5, Math.min(95, pct));
  }

  getDotSize(volatility: number): number {
    // volatility 越高点越小 (10-22px)
    return Math.max(10, Math.min(22, 22 - volatility * 30));
  }

  getClassificationColor(classification: string): string {
    const found = this.classificationColors.find(c => c.label === classification);
    return found ? found.color : '#9e9e9e';
  }

  selectStudent(student: any): void {
    const sid = student.student_id || student.studentId;
    this.selectedStudentId = sid;
    console.log(`[TeacherScoresComponent] selectStudent: ${student.name} (${sid})`);
    if (!sid) {
      console.error(`[TeacherScoresComponent] selectStudent: no student_id, student=`, JSON.stringify(student));
      return;
    }
    this.apiService.getStudentTrajectory(sid, this.analysisData?.subject).subscribe({
      next: (data) => {
        this.trajectoryData = data;
        console.log(`[TeacherScoresComponent] trajectory loaded for ${student.name}`);
      },
      error: (err) => {
        console.error(`[TeacherScoresComponent] loadTrajectory failed:`, err);
      },
    });
  }

  closeTrajectory(): void {
    this.trajectoryData = null;
    this.selectedStudentId = null;
  }

  getTrajBarWidth(score: number): number {
    // 原始分 0-150 → width 0-100%
    return Math.min(100, (score / 150) * 100);
  }

  getExamTypeLabel(type: string): string {
    const map: any = { monthly1: '月考1', monthly2: '月考2', midterm: '期中', final: '期末' };
    return map[type] || type;
  }

  // ===== Helpers =====

  getLatestDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  logout(): void {
    console.log(`[TeacherScoresComponent] logout`);
    this.authService.logout();
  }
}
