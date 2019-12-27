import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';

import { of } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

import unified from 'unified';
import markdown from 'remark-parse';
import toc from 'mdast-util-toc';
import visit from 'unist-util-visit';
import stringify from 'remark-stringify';
import toString from 'mdast-util-to-string';
import slug from 'remark-slug';
import { links, images } from '../../shared/links';
import frontmatter from 'remark-frontmatter';
import * as MDAST from 'mdast';
import * as UNIFIED from 'unified';

import { VFile } from '../../../vendor';
import { join } from '../../shared/utils';

import { FetchService } from '../../services/fetch.service';
import { LocationService } from '../../services/location.service';

interface Link extends MDAST.Link {
  data: any;
}

export function getTitle(): UNIFIED.Transformer {
  return (tree: MDAST.Root, file: VFile) => {
    file.data = file.data || {};
    return visit(tree, 'heading', (node: MDAST.Heading) => {
      if (node.depth === 1 && !file.data.title) {
        file.data.title = toString(node);
      }
      return true;
    });
  };
}

@Component({
  selector: 'docspa-toc-search', // tslint:disable-line
  template: `
  <div class="search" *ngIf="searchIndex">
    <div class="input-wrap">
      <input
        #searchInput
        type="search"
        value=""
        placeholder="Search topics"
        aria-label="Search topics"
        (keyup)="search($event.target.value)"
        (search)="search($event.target.value)">
    </div>

    <div class="results-panel" [class.show]="searchResults">
      <p class="empty" *ngIf="searchResults?.length === 0">No results!</p>
      <div class="matching-post" *ngFor="let result of searchResults | slice:0:9">
        <a [attr.href]="result.url" (click)="search(searchInput.value = '')">
          <h2 [innerHTML]="result.name"></h2>
          <p [innerHTML]="result.content"></p>
        </a>
      </div>
    </div>
  </div>
  `,
  styleUrls: ['./toc-search.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TOCSearchComponent implements OnInit {
  static readonly is = 'md-toc-search';

  @Input()
  set paths(val: string[]) {
    if (typeof val === 'string') {
      val = (val as string).split(',');
    }
    if (!Array.isArray(val)) {
      val = [val];
    }
    this._paths = val;
  }
  get paths(): string[] {
    return this._paths;
  }

  @Input()
  summary: string;

  @Input()
  minDepth = 1;

  @Input()
  maxDepth = 6;

  private processor: any;
  private processLinks: any;

  private _paths: string[];

  searchIndex: any[];
  searchResults: any[];

  constructor(
    private fetchService: FetchService,
    private locationService: LocationService
  ) {
    const toToc = () => {
      return (tree: MDAST.Root) => {
        const result = toc(tree, { maxDepth: this.maxDepth });
        tree.children = [].concat(
          tree.children.slice(0, result.index),
          result.map || []
        );
        return tree;
      };
    };

    const removeMinNodes = () => {
      return (tree: MDAST.Root, file: VFile) => {
        file.data = file.data || {};
        return visit(tree, 'heading', (node: MDAST.Heading, index, parent) => {
          if (node.depth < this.minDepth) {
            parent.children.splice(index, 1);
          }
          return true;
        });
      };
    };

    const getLinks = () => {
      return (tree: MDAST.Root, file: VFile) => {
        file.data = file.data || {};
        file.data.tocSearch = [];
        return visit(tree, 'link', (node: Link) => {
          const url = node.url;
          const content = toString(node);
          const name = (file.data.matter ? file.data.matter.title : false) || file.data.title || file.path;
          file.data.tocSearch.push({
            name,
            url,
            content,
            depth: node.depth as number
          });
          return true;
        });
      };
    };

    // TODO: use toc directly instead of passing through remark2rehype and rehypeStringify
    this.processor = unified() // md -> toc -> md + links
      .use(markdown)
      .use(frontmatter)
      .use(slug)
      .use(getTitle)
      .use(removeMinNodes)
      .use(toToc)
      .use(links, locationService)
      .use(images, locationService)
      .use(getLinks)
      .use(stringify);

    this.processLinks = unified() // md -> md + links
      .use(markdown)
      .use(frontmatter)
      .use(slug)
      .use(getLinks)
      .use(stringify);
  }

  ngOnInit() {
    if (!this.paths && this.summary) {
      this.loadSummary(this.summary).then(paths => {
        this.paths = paths;
        this.generateSearchIndex(this.paths);
      });
    } else {
      this.generateSearchIndex(this.paths);
    }
  }

  search(query: string) {
    if (typeof query !== 'string' || query.trim() === '') {
      this.searchResults = null;
      return;
    }

    const regEx = new RegExp(
      query.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'),
      'gi'
    );

    const matchingResults = [];

    this.searchIndex.forEach(link => {
      const index = link.content.search(regEx);
      if (index > -1) {
        const start = index < 21 ? 0 : index - 20;
        const end = start + 40;
        const content = link.content
          .substring(start, end)
          .replace(regEx, x => `<em class="search-keyword">${x}</em>`);
        matchingResults.push({
          ...link,
          content
        });
      }
    });

    this.searchResults = matchingResults;
  }

  private loadSummary(summary: string) {
    const vfile = this.locationService.pageToFile(summary);
    const fullPath = join(vfile.cwd, vfile.path);
    return this.fetchService.get(fullPath).pipe(
      flatMap(resource => {
        vfile.contents = resource.contents;
        vfile.data = vfile.data || {};
        return resource.notFound ? of(null) : this.processLinks.process(vfile);
      }),
      map((_: any) => {
        return _.data.tocSearch.map(__ => __.url).join(',');
      })
    ).toPromise();
  }

  private generateSearchIndex(paths: string[]) {
    if (!paths) {
      this.searchIndex = null;
      return;
    }
    const promises = paths.map(_ => {
      const vfile = this.locationService.pageToFile(_);
      const fullPath = join(vfile.cwd, vfile.path);
      return this.fetchService.get(fullPath)
        .pipe(
          flatMap(resource => {
            vfile.contents = resource.contents;
            vfile.data = vfile.data || {};
            return resource.notFound ? of(null) : this.processor.process(vfile);
          })
        ).toPromise();
    });

    return Promise.all(promises).then(files => {
      this.searchIndex = (files.reduce((acc: any[], file: any): any[] => {
        return file ? acc.concat(file.data.tocSearch) : acc;
      }, []) as any[]);
    });
  }
}
