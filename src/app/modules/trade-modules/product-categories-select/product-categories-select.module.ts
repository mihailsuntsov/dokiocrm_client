import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCategoriesSelectComponent } from './product-categories-select.component';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { MaterialModule } from 'src/app/modules/material.module';
import { FormsModule, } from '@angular/forms';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@ngneat/transloco';

@NgModule({
  declarations: [ProductCategoriesSelectComponent],
  imports: [
    CommonModule,
    
    DragDropModule,
    MaterialModule,
    FormsModule,
    TranslocoModule
  ],
  exports: [ProductCategoriesSelectComponent],
  providers:[{ provide: TRANSLOCO_SCOPE, useValue: ['docs','modules']},]
})
export class ProductCategoriesSelectModule { }
