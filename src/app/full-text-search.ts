import { Subject } from 'rxjs';
import { take, filter } from 'rxjs/operators';

export class FullTextObjectSearch {


    private indexDataIdSeparator = '>>>><<<<<';
    private indexEntryStartSeparator = '####<<<>>>>####';
    private indextEntryEndSeparator = '@@@@@<<<>>>>@@@@@';
    private worker: Worker;
    private workerSearchSuccess: Subject<any> = new Subject<any>();

    constructor(
        private data: any,
        private fields: string[]) {
            this.initWorker();
            const index = this.generateIndexOnData(data, fields);
            this.worker.postMessage({
                message: 'set-index',
                index,
                indexDataIdSeparator: this.indexDataIdSeparator,
                indexEntryStartSeparator: this.indexEntryStartSeparator,
                indextEntryEndSeparator: this.indextEntryEndSeparator
            });
    }

    public async search(searchTerm: string): Promise<any[]> {
        const searchId = this.genRandomString();
        return new Promise((resolve) => {
            this.worker.postMessage({ message: 'search', searchTerm, searchId });
            this.workerSearchSuccess
              .pipe(
                filter(res => res.searchId === searchId),
                take(1)
              )
              .subscribe(res => {
                const ids = res.results;
                const results = ids.map(id => this.data[id]);
                resolve(results);
              })
          })
    }


    private generateIndexOnData(data: any, fields: string[]): string[] {
        const indexArr = [];
        let index = '';
        const dataKeys = Object.keys(data);
        for (let i = 0; i < dataKeys.length; i++) {
          const key = dataKeys[i];
          const item = data[key];
          index += this.indexEntryStartSeparator;
          fields.forEach(field => {
            index += `${item[field]} `
          });
          index += this.indexDataIdSeparator;
          index += key;
          index += this.indextEntryEndSeparator;
          if (index.length > 1000000) {
            indexArr.push(index);
            index = '';
          }
        }
        return indexArr;
    }


    private initWorker(): void {
        if (typeof Worker !== 'undefined') {
          // Create a new
          this.worker = new Worker('./app.worker', { type: 'module' });
          this.worker.onmessage = ({ data }) => {
            console.log(`page got message:`);
            console.log(data);
            if (data.message === 'search-success') {
              this.workerSearchSuccess.next({ results: data.results, searchId: data.searchId });
            }
          };
        } else {
          // Web Workers are not supported in this environment.
          // You should add a fallback so that your program still executes correctly.
        }
      }

    private genRandomString(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }


}