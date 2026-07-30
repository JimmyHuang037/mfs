import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { StudentShellComponent } from './student/student-shell.component';
import { TeacherScoresComponent } from './teacher/teacher-scores.component';
import { AdminStudentsComponent } from './admin/admin-students.component';
import { AdminTeachersComponent } from './admin/admin-teachers.component';
import { AdminClassesComponent } from './admin/admin-classes.component';
import { AdminScoresComponent } from './admin/admin-scores.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Student routes
  { path: 'student/scores', component: StudentShellComponent },

  // Teacher routes
  { path: 'teacher/scores', component: TeacherScoresComponent },

  // Admin routes
  { path: 'admin/students', component: AdminStudentsComponent },
  { path: 'admin/teachers', component: AdminTeachersComponent },
  { path: 'admin/classes', component: AdminClassesComponent },
  { path: 'admin/scores', component: AdminScoresComponent },

  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
