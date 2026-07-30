import * as XLSX from 'xlsx';
const wb = XLSX.utils.book_new();
const data = [
  ['学号', '科目', '类型', '分数'],
  ['S0101', '数学', 'monthly1', 95],
  ['S0102', '语文', 'monthly1', 88.5],
  ['S9999', '英语', 'monthly1', 70],
  ['S0101', '物理', 'monthly1', 92],
];
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, '/home/jimmy/repo/mfs/e2e/tests/helpers/test-import.xlsx');
console.log('OK');