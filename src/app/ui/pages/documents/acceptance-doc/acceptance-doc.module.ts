import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcceptanceDocRoutingModule } from './acceptance-doc-routing.module';
import { AcceptanceDocComponent } from './acceptance-doc.component';

import { MaterialModule } from '../../../../modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsAcceptanceDialogModule } from '../../../../modules/settings/settings-acceptance-dialog/settings-acceptance-dialog.module';
import { AcceptanceProductsTableModule } from 'src/app/modules/trade-modules/acceptance-products-table/acceptance-products-table.module';
import { BalanceCagentModule } from 'src/app/modules/info-modules/balance/balance-cagent/balance-cagent.module';

@NgModule({
  declarations: [AcceptanceDocComponent],
  imports: [
    CommonModule,
    AcceptanceDocRoutingModule,
    SettingsAcceptanceDialogModule,
    AcceptanceProductsTableModule,
    BalanceCagentModule,

    MaterialModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class AcceptanceDocModule { }
