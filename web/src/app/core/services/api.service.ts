import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Score } from '@app/models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {
    // 添加调试信息
    console.log(`API服务初始化，基础URL: ${this.apiUrl}`);
  }

  getStudentScores(studentId: string): Observable<Score[]> {
    return this.http.get<Score[]>(`${this.apiUrl}/students/${studentId}/scores`);
  }

  login(username: string, password: string): Observable<any> {
    console.log(`调用登录API，用户名: ${username}`);  // 调试日志
    return this.http.post(`${this.apiUrl}/login`, { username, password });
  }

  // 新增调试方法
  testLogin(): Observable<any> {
    const testData = { username: '1001', password: 'zhangsan123' };
    console.log('测试登录数据:', testData);
    console.log(`调试命令: curl -X POST '${this.apiUrl}/login' \\
      -H "Content-Type: application/json" \\
      -d '${JSON.stringify(testData)}'`);
    return this.login(testData.username, testData.password);
  }
}
