/**
 * 模块入口文件
 * 此文件用于重新导出模块中的所有公共接口和类型
 */
export * from './score.model';

// 添加显式导出
export { Score } from './score.model';
export { Student } from './student.model';