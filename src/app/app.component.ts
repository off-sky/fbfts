import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { map, startWith, debounceTime, switchMap, take, filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'fbfts';

  public searchControl = new FormControl();
  public displayData$: Observable<any[]>;
  public loading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private fNames = [
    'Robert',
    'Richard',
    'Snizhana',
    'Anna',
    'Vitaly',
    'Alex'
  ];

  private lNames = [
    'Johnes',
    'Travolta',
    'Dzhergansky'
  ];

  private favColors = [
    'blue',
    'white',
    'yellow',
    'red'
  ];

  private descriptions = [
    `I am working on an expression builder that allows you to create expressions for filtering a data set`,
    `Regular Expressions commonly known as formatted text strings used to find patterns in text`
  ]

  private emails = [
    'swd@gmail.com',
    'petrodzher@gmail.com',
    'strand@gmail.com'
  ];

  private cars = [
    'Audi',
    'BMW',
    'Volvo'
  ];
  private numDataEntries = 2000000;
  private data: any;
  private allDataArr = [];
  private index: string[] = [];
  private worker: Worker;
  private workerSearchSuccess: Subject<any> = new Subject<any>();

  private indexDataIdSeparator = '>>>><<<<<';
  private indexEntryStartSeparator = '####<<<>>>>####';
  private indextEntryEndSeparator = '@@@@@<<<>>>>@@@@@';

  constructor() {
    this.initWorker();
    this.initData(this.numDataEntries);
    console.log(this.index);
    this.displayData$ = this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(600),
        switchMap(searchTerm => {
          console.log('Searching: ', searchTerm);
          if (!searchTerm || searchTerm.length === 0) {
            return of(this.allDataArr);
          } else {
            const startTime = new Date().getTime();
            const searchId = this.genRandomString();
            this.searchWorker(searchTerm, searchId);
            this.loading$.next(true);
            return this.workerSearchSuccess
              .pipe(
                filter(result => result.searchId === searchId),
                take(1),
                map(res => res.results),
                map(ids => {
                  const endTime = new Date().getTime();
                  console.log(`Searched ${this.numDataEntries} in ${endTime - startTime} millis`);
                  const res = ids.map(id => this.data[id]);
                  console.log(res);
                  this.loading$.next(false);
                  return res;
                })
              );
          }
        }),
        map(arr => arr.slice(0, 50))
      )
  }

  private initData(numDataEntries): void {
    this.data = this.generateData(numDataEntries);
    this.allDataArr = Object.values(this.data);

    const fields = ['firstName', 'lastName', 'car', 'favoriteColor', 'description'];
    this.index = this.generateIndexOnData(this.data, fields);
    this.worker.postMessage({
      message: 'set-index',
      index: this.index,
      indexDataIdSeparator: this.indexDataIdSeparator,
      indexEntryStartSeparator: this.indexEntryStartSeparator,
      indextEntryEndSeparator: this.indextEntryEndSeparator
    });
  }
  
  private async search(searchStr: string, data: any, index: string): Promise<any[]> {

    const searchWords = searchStr.split(' ');
    let regexSearchPartial: string;
    if (searchWords.length > 1) {
      const combinations = this.getAllArrayCombinations(searchWords);
      regexSearchPartial = combinations
        .map(comb => comb.join('(\\s|[A-Za-z0-9<>\\-_])*'))
        .join('|')
    } else {
      regexSearchPartial = searchWords.join('');
    }
    const regexStr = `${this.indexEntryStartSeparator}(\\s|[A-Za-z0-9<>\\-_])*(${regexSearchPartial})+(\\s|[A-Za-z0-9<>\\-_])*${this.indextEntryEndSeparator}`;
    const regex = new RegExp(
      regexStr,
      'gi'
    )
    const matched = index.match(regex);
    const ids = this.getResultIdsFromMatches(
      matched
    )
    return ids.map(id => data[id]);
  }

  private async searchWorker(searchStr, searchId: string): Promise<string[]> {
    return new Promise((resolve) => {
      this.worker.postMessage({ message: 'search', searchTerm: searchStr, searchId });
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

  private getAllArrayCombinations(input: string[]): [][] {
    var result = [];
    var f = function(prefix = [], array) {
      for (var i = 0; i < array.length; i++) {
        result.push([...prefix, array[i]]);
        f([...prefix, array[i]], array.filter(item => item !== array[i]));
      }
    }
    f(undefined, input);
    return result.filter(item => item.length === input.length);
  }

  private getResultIdsFromMatches(matches: string[]): string[] {
    if (!matches) {
      return [];
    }
    const replaceRegex = new RegExp(`(${this.indexEntryStartSeparator}|${this.indextEntryEndSeparator})`, 'g');
    let results = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const stripped = match.replace(replaceRegex, '');
      const id = stripped.split(' ' + this.indexDataIdSeparator)[1];
      results.push(id);
    }
    return results;
  }

  private generateData(numEntities: number): any {
    let i = 0;
    const data = {};
    while(i++ < numEntities) {
      const id = this.genRandomString();
      data[id] = {
        id,
        firstName: this.pickRandomArrayValue(this.fNames),
        lastName: this.pickRandomArrayValue(this.lNames),
        email: this.pickRandomArrayValue(this.emails),
        description: this.pickRandomArrayValue(this.descriptions),
        favoriteColor: this.pickRandomArrayValue(this.favColors),
        car: this.pickRandomArrayValue(this.cars)
      }
    }
    return data;
  }


  private generateIndexOnData(data: any, fields: string[]): string[] {
    const indexArr = [];
    let index = '';
    for (let [ id, item ] of Object.entries(data)) {
      index += this.indexEntryStartSeparator;
      fields.forEach(field => {
        index += `${item[field]} `
      });
      index += this.indexDataIdSeparator;
      index += id;
      index += this.indextEntryEndSeparator;
      if (index.length > 1000000) {
        indexArr.push(index);
        index = '';
      }
    }
    return indexArr;
  }


  private genRandomString(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }


  private pickRandomArrayValue(arr: any[]): any {
    const ind = Math.floor(Math.random() * arr.length);
    return arr[ind];
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


}

