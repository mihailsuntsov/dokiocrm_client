import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InvoiceinProductsTableComponent } from './invoicein-products-table.component';
import { ControlMessagesComponent } from './control-messages.component';
import { ValidationService } from './validation.service';
import { ProductCategoriesSelectModule } from 'src/app/modules/trade-modules/product-categories-select/product-categories-select.module';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@ngneat/transloco';

@NgModule({
  declarations: [InvoiceinProductsTableComponent, ControlMessagesComponent],
  imports: [
    CommonModule,

    MaterialModule,
    FormsModule,
    ProductCategoriesSelectModule,
    ReactiveFormsModule,
    TranslocoModule
  ],
  exports: [InvoiceinProductsTableComponent],
  providers: [ValidationService,
    { provide: TRANSLOCO_SCOPE, useValue: ['docs','modules']},
  ],
})
export class InvoiceinProductsTableModule { }
