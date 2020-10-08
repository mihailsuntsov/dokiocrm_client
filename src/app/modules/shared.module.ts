// Модуль для хранения переиспользуемых компонент, директив и пайпов
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WINDOW_PROVIDERS } from '../window.providers';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../modules/material.module';
import { MatButtonModule } from '@angular/material/button';
import { DragDropModule } from '@angular/cdk/drag-drop';
//Диалоги
import { MatDialogModule } from '@angular/material/dialog';
import { DeleteDialog } from 'src/app/ui/dialogs/deletedialog.component'
import { UniversalCategoriesDialogComponent } from 'src/app/ui/dialogs/universal-categories-dialog/universal-categories-dialog.component'
import { FilesUploadDialogComponent } from 'src/app/ui/dialogs/files-upload-dialog/files-upload-dialog.component'
import { ConfirmDialog } from 'src/app/ui/dialogs/confirmdialog-with-custom-text.component'
import { PricesDialogComponent } from 'src/app/ui/dialogs/prices-dialog/prices-dialog.component'
import { ProductCagentsDialogComponent } from 'src/app/ui/dialogs/product-cagents-dialog/product-cagents-dialog.component'
import { ProductCategoriesDialogComponent } from 'src/app/ui/dialogs/product-categories-dialog/product-categories-dialog.component'
import { ProductGroupFieldsDialogComponent } from 'src/app/ui/dialogs/product-group-fields-dialog/product-group-fields-dialog.component'
import { RemainsDialogComponent } from 'src/app/ui/dialogs/remains-dialog/remains-dialog.component'
import { ProductBarcodesDialogComponent } from 'src/app/ui/dialogs/product-barcodes-dialog/product-barcodes-dialog.component'
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component'
import { ProductDuplicateDialog } from 'src/app/ui/dialogs/product-duplicate-dialog.component'
import { ShowImageDialog } from 'src/app/ui/dialogs/show-image-dialog.component'

@NgModule({
  declarations: [
    DeleteDialog,
    ConfirmDialog,
    UniversalCategoriesDialogComponent,
    FilesUploadDialogComponent,
    PricesDialogComponent,
    ProductCagentsDialogComponent,
    ProductCategoriesDialogComponent,
    ProductGroupFieldsDialogComponent,
    RemainsDialogComponent,
    ProductBarcodesDialogComponent,
    MessageDialog,
    ProductDuplicateDialog,
    ShowImageDialog,

  ],
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MaterialModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    
  ],
  exports: [
    DeleteDialog,
    ConfirmDialog,
    UniversalCategoriesDialogComponent,
    FilesUploadDialogComponent,
    PricesDialogComponent,
    ProductCagentsDialogComponent,
    ProductCategoriesDialogComponent,
    ProductGroupFieldsDialogComponent,
    RemainsDialogComponent,
    ProductBarcodesDialogComponent,
    MessageDialog,
    ProductDuplicateDialog,
    ShowImageDialog,

  ],
  providers: [WINDOW_PROVIDERS],
})
export class SharedModule { }
