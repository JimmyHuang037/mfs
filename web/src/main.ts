import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';
import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { CamelCaseInterceptor } from './app/core/services/camelcase.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: CamelCaseInterceptor, multi: true },
    importProvidersFrom(
      AppRoutingModule,
      HttpClientModule,
      NgxEchartsModule.forRoot({ echarts }),
    ),
  ]
})