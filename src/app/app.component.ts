import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { map, startWith, debounceTime, switchMap, take, filter, tap } from 'rxjs/operators';
import { FullTextObjectSearch } from './full-text-search';

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
  private fts: FullTextObjectSearch;

  constructor() {
    // this.initWorker();
    this.initData(this.numDataEntries);
    this.fts = new FullTextObjectSearch(this.data, ['firstName', 'lastName', 'car', 'favoriteColor', 'description'])
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
            // this.searchWorker(searchTerm, searchId);
            this.loading$.next(true);
            return this.fts.search(searchTerm);
          }
        }),
        map(arr => arr.slice(0, 50)),
        tap(() => this.loading$.next(false))
      )
  }

  private initData(numDataEntries): void {
    this.data = this.generateData(numDataEntries);
    this.allDataArr = Object.values(this.data);
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


}

