import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderinDocRoutingModule } from './orderin-doc-routing.module';
import { OrderinDocComponent } from './orderin-doc.component';
import { ValidationService } from './validation.service';
import { MaterialModule } from '../../../../modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsOrderinDialogModule } from '../../../../modules/settings/settings-orderin-dialog/settings-orderin-dialog.module';
import { BalanceCagentModule } from 'src/app/modules/info-modules/balance/balance-cagent/balance-cagent.module';

@NgModule({
  declarations: [OrderinDocComponent,],
  imports: [
    CommonModule,
    OrderinDocRoutingModule,
    SettingsOrderinDialogModule,
    BalanceCagentModule,

    MaterialModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [ValidationService],
})
export class OrderinDocModule { }
