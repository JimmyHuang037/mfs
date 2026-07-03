import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: `
    <div>
      <h2>测试页面</h2>
      <p>如果你能看到这个页面，说明路由正常。</p>
    </div>
  `,
  styles: []
})
export class TestComponent {

}
