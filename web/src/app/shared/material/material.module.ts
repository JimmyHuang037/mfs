import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';

@NgModule({
  imports: [
    MatTableModule,
    MatCardModule
  ],
  exports: [
    MatTableModule,
    MatCardModule
  ]
})
export class MaterialModule {}