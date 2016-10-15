import {Component, OnInit} from '@angular/core';
import {Component} from '@angular/core';
import {ImportListService, Transaction, CostCharacter, CostType} from "../../shared/services/import-list.service";
import {CostMatch, CostMatchService} from "../../shared/services/cost-match.service";
import {LabelService} from "../../shared/services/label.service";
import {VatCalculationService, VatReport} from "../../shared/services/vat-calculation.service";

@Component({
  moduleId: module.id,
  selector: 'vat',
  templateUrl: 'vat.component.html',
  styleUrls: ['vat.component.css']
})
export class VatComponent implements OnInit {
  uploadedFile: File;
  importedText: string;

  public vatReport: VatReport;

  private costMatches;

  transactionsLoaded: number = 0;
  transactionsUnmatched: number;
  public rows:Array<any> = [];

  public columns:Array<any> = [
    {title: 'Datum', name: 'dateFormatted'},
    {title: 'Bedrag', name: 'amount'},
    {title: 'Bedrag Netto', name: 'amountNet'},
    {title: 'btw', name: 'amountVat'},
    {title: 'Omschrijving', name: 'description'},
    {title: 'Type', name: 'costTypeDescription'},
    {title: 'Zakelijk/Prive', name: 'costCharacterDescription', sort: 'asc'}
  ];
  public page:number = 1;
  public itemsPerPage:number = 10;
  public maxSize:number = 5;
  public numPages:number = 1;
  public length:number = 0;

  public config:any = {
    paging: true,
    sorting: {columns: this.columns, sortType: 'alphabetic'},
    filtering: {filterString: '', columnName: 'description', onlyUnknown: false}
  };

  private transactions:Array<Transaction> = [];

  // TODO: extract cost match component
  public costMatch: CostMatch;

  constructor(
    private importListService: ImportListService,
    public costMatchService: CostMatchService,
    private labelService: LabelService
  ) {
    this.uploadedFile = null;
    this.length = 0;
    this.costMatch = new CostMatch();
  }

  ngOnInit() {
    this.costMatches = this.costMatchService.getMatches()
      .subscribe(
        costMatchData => this.costMatches = costMatchData,
        error => {
          alert(error.text());
          console.log(error.text());
        },
        () => console.log('Costmatches retrieved')
      )
  }

  displayVatTypeSelector() {
    return this.costMatch.costType != CostType.BUSINESS_FOOD;
  }

  private checkTransactions(): void {
    this.transactionsUnmatched = 0;
    for (let i = 0; i < this.transactions.length; i++) {
      if (this.transactions[i].costCharacter === CostCharacter.UNKNOWN) {
        this.transactionsUnmatched++;
      }
    }

    this.config.filtering.onlyUnknown = this.transactionsUnmatched > 0;
  }

  fileChangeEvent(fileInput: any){
    this.uploadedFile = fileInput.target.files[0];
    var reader = new FileReader();
    reader.onload = file => {
      var contents: any = file.target;
      this.importedText = contents.result;
      this.transactions = this.transactions.concat(this.importListService.convert(this.importedText));
      this.transactions = this.costMatchService.match(this.transactions, this.costMatches);
      this.transactionsLoaded = this.transactions.length;
      this.length = this.transactions.length;
      if (this.transactionsLoaded) {
        this.checkTransactions();
        this.updateTotalVat();
        this.onChangeTable(this.config);
      }
    };
    reader.readAsText(this.uploadedFile);

  }

  public addMatch():void {
    this.costMatch.matchString = this.config.filtering.filterString;
    this.costMatchService.addMatch(this.costMatch);
    this.costMatches = (<CostMatch[]>this.costMatches).concat(this.costMatch);
    this.transactions = this.costMatchService.match(this.transactions, this.costMatches);

    for (let i = 0; i < this.transactions.length; i++) {
      if (this.transactions[i].description.indexOf(this.config.filtering.filterString) > -1) {
        this.transactions[i].costTypeDescription = this.labelService.get(CostType[this.transactions[i].costType]);
        this.transactions[i].costCharacterDescription = this.labelService.get(CostCharacter[this.transactions[i].costCharacter]);
      }
    }
    this.checkTransactions();
    this.updateTotalVat();

    this.config.filtering.filterString = '';
    this.onChangeTable(this.config);
  }

  public addMatchDisabled():boolean {
    return this.config.filtering.filterString.length < 2;
  }

  private updateTotalVat():void {
    this.vatReport = VatCalculationService.calculateTotalVat(this.transactions);
  }

  public calculateVatDisabled():boolean {
    return this.transactionsUnmatched > 0;
  }

  // TODO: extract table component
  // FIXME: page counter doesn't work
  public changePage(page:any, data:Array<any> = this.transactions):Array<any> {
    let start = (page.page - 1) * page.itemsPerPage;
    let end = page.itemsPerPage > -1 ? (start + page.itemsPerPage) : data.length;
    return data.slice(start, end);
  }

  public changeSort(data:any, config:any):any {
    if (!config.sorting) {
      return data;
    }

    let columns = this.config.sorting.columns || [];
    let columnName:string = void 0;
    let sort:string = void 0;

    for (let i = 0; i < columns.length; i++) {
      if (columns[i].sort !== '') {
        columnName = columns[i].name;
        sort = columns[i].sort;
      }
    }

    if (!columnName) {
      return data;
    }

    // simple sorting
    return data.sort((previous:any, current:any) => {
      if (this.config.sorting.sortType === 'alphabetic') {
        if (previous[columnName] > current[columnName]) {
          return sort === 'desc' ? -1 : 1;
        } else if (previous[columnName] < current[columnName]) {
          return sort === 'asc' ? -1 : 1;
        }
        return 0;
      }
    });
  }

  public changeFilter(data:any, config:any):any {
    if (!config.filtering) {
      return data;
    }

    let filteredData:Array<any> = data.filter((item:any) =>
      item[config.filtering.columnName].match(this.config.filtering.filterString)
        && (!config.filtering.onlyUnknown || item.costCharacter === CostCharacter.UNKNOWN)
    );
    return filteredData;
  }

  public onChangeTable(config:any, page:any = {page: this.page, itemsPerPage: this.itemsPerPage}):any {
    if (config.filtering) {
      Object.assign(this.config.filtering, config.filtering);
    }
    if (config.sorting) {
      Object.assign(this.config.sorting, config.sorting);
    }

    let filteredData = this.changeFilter(this.transactions, this.config);
    let sortedData = this.changeSort(filteredData, this.config);
    this.rows = page && config.paging ? this.changePage(page, sortedData) : sortedData;
    this.length = sortedData.length;
  }
}
