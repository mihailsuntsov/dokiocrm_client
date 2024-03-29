import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReturnRoutingModule } from './return-routing.module';
import { ReturnComponent } from './return.component';
import { SettingsReturnDialogModule } from '../../../../modules/settings/settings-return-dialog/settings-return-dialog.module';

import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../modules/material.module';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@ngneat/transloco';

@NgModule({
  declarations: [ReturnComponent],
  providers: [
    { provide: TRANSLOCO_SCOPE, useValue: 'menu' }
  ],
  imports: [
    CommonModule,
    ReturnRoutingModule,
    SettingsReturnDialogModule,

    MaterialModule,
    FormsModule,
    TranslocoModule
  ]
})
export class ReturnModule { }
