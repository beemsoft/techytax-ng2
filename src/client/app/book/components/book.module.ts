import {NgModule, CUSTOM_ELEMENTS_SCHEMA} from "@angular/core";
import {BookComponent} from "./book.component";
import {BookService} from "../../shared/services/book.service";
import {PaginationModule} from "ng2-bootstrap/ng2-bootstrap";
import {ModalModule} from "ngx-modal/index";
import {Ng2TableModule} from "ng2-table/ng2-table";
import {BookTableComponent} from "./book-table.component";
import {SharedModule} from "../../shared/shared.module";
import {CommonModule} from "@angular/common";

@NgModule({
    imports: [
        CommonModule,
        SharedModule,
        Ng2TableModule,
        PaginationModule,
        ModalModule
    ],
    declarations: [
        BookComponent,
        BookTableComponent
    ],
    exports: [BookComponent],
    providers: [
        BookService,
        BookTableComponent
    ],
    schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
})

export class BookModule { }