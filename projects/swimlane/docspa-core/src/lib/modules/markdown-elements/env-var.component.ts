import { Component, Input, Optional, Inject } from '@angular/core';
import { DOCSPA_ENVIRONMENT } from '../../docspa-core.tokens';

@Component({
  selector: 'docspa-env', // tslint:disable-line
  template: `{{value}}`,
  styles: []
})
export class EnvVarComponent {
  static readonly is = 'md-env';

  @Input()
  var: string;

  value: string;

  constructor(@Optional() @Inject(DOCSPA_ENVIRONMENT) private environment: any) {
  }

  ngOnChanges() {
    this.value = String(this.var ? this.environment[this.var] : '');
  }
}


