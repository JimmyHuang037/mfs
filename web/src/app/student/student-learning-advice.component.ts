import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AuthService } from '../auth/auth.service';
import { ApiService } from '@app/core/services/api.service';
import { SUBJECTS } from '@app/models';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-student-learning-advice',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    NgxEchartsDirective,
  ],
  template: `
    <div class="page-container">
      <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>正在分析你的成绩数据...</p>
      </div>

      <div *ngIf="!loading && data" class="content">

        <!-- 各科分数趋势折线图 -->
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>📈 各科分数趋势</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="scoreTrendOption" class="chart-container"></div>
          </mat-card-content>
        </mat-card>

        <!-- 总排名趋势折线图 -->
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>📊 总排名趋势</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="rankTrendOption" class="chart-container chart-small"></div>
          </mat-card-content>
        </mat-card>

        <!-- 各科百分位雷达图 -->
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>🎯 各科实力分布（最近一次考试）</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div echarts [options]="radarOption" class="chart-container chart-small"></div>
          </mat-card-content>
        </mat-card>

        <!-- 温和建议文案 -->
        <mat-card class="section advice-card">
          <mat-card-header>
            <mat-card-title>💬 学习建议</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="advice-list">
              <div class="advice-item" [class.summary]="item.isSummary" *ngFor="let item of data.advice; let i = index">
                <span class="advice-icon">{{ getAdviceIcon(item.text) }}</span>
                <span class="advice-text">
                  <strong *ngIf="item.subject" class="subject-tag">{{ item.subject }}</strong>
                  {{ item.text }}
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 900px; margin: 0 auto; }
    .loading { text-align: center; padding: 60px; color: #666; }
    .loading p { margin-top: 16px; font-size: 15px; }
    .section { margin-bottom: 24px; }
    .chart-container { width: 100%; height: 350px; }
    .chart-small { height: 300px; }

    /* 建议卡片 */
    .advice-card { background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%); }
    .advice-list { display: flex; flex-direction: column; gap: 12px; }
    .advice-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px; background: rgba(255,255,255,0.8);
      border-radius: 8px; font-size: 14px; line-height: 1.6;
    }
    .advice-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
    .advice-text { color: #333; }
    .subject-tag { color: #1976d2; margin-right: 4px; }
    .advice-item.summary { background: rgba(25,118,210,0.12); border-left: 4px solid #1976d2; }
    .advice-item.summary .advice-text { font-weight: 700; font-size: 15px; color: #0d47a1; }
  `]
})
export class StudentLearningAdviceComponent implements OnInit {
  loading = true;
  data: any = null;

  scoreTrendOption: any = {};
  rankTrendOption: any = {};
  radarOption: any = {};

  private subjects = SUBJECTS;
  private colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#9a60b4'];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
  ) {}

  async ngOnInit() {
    console.log('[LearningAdvice] ngOnInit');
    const student = this.authService.getStudent();
    if (!student) {
      console.error('[LearningAdvice] no student');
      this.loading = false;
      return;
    }
    const studentId = student.studentId;

    try {
      console.log(`[LearningAdvice] fetching advice for ${studentId}`);
      this.data = await lastValueFrom(this.apiService.getLearningAdvice(studentId));
      console.log('[LearningAdvice] data received:', this.data);
      this.buildCharts();
    } catch (err) {
      console.error('[LearningAdvice] failed:', err);
    } finally {
      this.loading = false;
    }
  }

  private buildCharts() {
    if (!this.data) return;
    const labels = this.data.examLabels;

    // 1. 各科分数趋势折线图
    const series = this.subjects.map((subj, i) => ({
      name: subj,
      type: 'line',
      smooth: true,
      symbolSize: 8,
      data: this.data.subjectTrends[subj] || [],
      itemStyle: { color: this.colors[i] },
    }));

    this.scoreTrendOption = {
      tooltip: { trigger: 'axis' },
      legend: { data: this.subjects, bottom: 0 },
      grid: { top: 30, right: 20, bottom: 40, left: 50 },
      xAxis: { type: 'category', data: labels, boundaryGap: false },
      yAxis: { type: 'value', name: '分数' },
      series,
    };

    // 2. 总排名趋势（倒序Y轴，排名越小越高）
    this.rankTrendOption = {
      tooltip: { trigger: 'axis', formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>年级排名: 第${p.value}名`;
      }},
      grid: { top: 30, right: 30, bottom: 30, left: 60 },
      xAxis: { type: 'category', data: labels, boundaryGap: false },
      yAxis: { type: 'value', name: '排名', inverse: true, min: 1 },
      series: [{
        type: 'line',
        smooth: true,
        symbolSize: 10,
        data: this.data.rankTrend,
        itemStyle: { color: '#ee6666' },
        areaStyle: { color: 'rgba(238,102,102,0.15)' },
      }],
    };

    // 3. 雷达图
    const indicator = this.subjects.map(s => ({ name: s, max: 100 }));
    const radarData = this.subjects.map(s => this.data.percentiles[s] || 0);

    this.radarOption = {
      tooltip: {},
      radar: {
        indicator,
        radius: '65%',
        axisName: { fontSize: 13, color: '#333' },
      },
      series: [{
        type: 'radar',
        data: [{
          value: radarData,
          name: '各科百分位',
          areaStyle: { color: 'rgba(84,112,198,0.3)' },
          itemStyle: { color: '#5470c6' },
        }],
      }],
    };
  }

  getAdviceIcon(text: string): string {
    if (text.includes('下滑') || text.includes('下降')) return '⚠️';
    if (text.includes('进步') || text.includes('上升') || text.includes('提升')) return '🌟';
    if (text.includes('优势')) return '💪';
    if (text.includes('稳定')) return '✅';
    return '💡';
  }
}
