import { TestBed } from '@angular/core/testing';
import { Location, LocationStrategy, HashLocationStrategy } from '@angular/common';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import * as VFILE from 'vfile';
import { join } from '../../utils';

import { MarkdownService } from './markdown.service';
import { DOCSPA_ENVIRONMENT } from '../../docspa-core.tokens';

describe('MarkdownService', () => {
  let markdownService: MarkdownService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        LoggerModule.forRoot({ level: NgxLoggerLevel.WARN })
      ],
      providers: [
        Location,
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: DOCSPA_ENVIRONMENT, useValue: { } },
        MarkdownService
      ]
    });

    markdownService = TestBed.get(MarkdownService);
    httpMock = TestBed.get(HttpTestingController);
  });

  it('should be created', () => {
    expect(markdownService).toBeTruthy();
  });

  /* xit('should load and process a file', () => {
    const text = '## Hello';
    markdownService.getMd('/').subscribe((res: VFILE.VFile) => {
      expect(res).toBeTruthy();
      expect(join(res.cwd, res.path)).toEqual('docs/README.html');
      expect(res.contents).toEqual('<h2>Hello</h2>\n');

      expect(res.path).toEqual('/README.html');
      expect(res.stem).toEqual('README');
      expect(join(res.cwd, res.path)).toEqual('docs/README.html');
    });

    const countryRequest = httpMock.expectOne('docs/README.md');
    countryRequest.flush(text);

    httpMock.verify();
  }); */
});
