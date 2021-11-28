import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentoutDocRoutingModule } from './paymentout-doc-routing.module';
import { PaymentoutDocComponent } from './paymentout-doc.component';
import { ValidationService } from './validation.service';
import { MaterialModule } from '../../../../modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsPaymentoutDialogModule } from '../../../../modules/settings/settings-paymentout-dialog/settings-paymentout-dialog.module';
import { BalanceCagentModule } from 'src/app/modules/info-modules/balance/balance-cagent/balance-cagent.module';

@NgModule({
  declarations: [PaymentoutDocComponent, /*ControlMessagesComponent*/],
  imports: [
    CommonModule,
    PaymentoutDocRoutingModule,
    SettingsPaymentoutDialogModule,
    BalanceCagentModule,

    MaterialModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [ValidationService],
})
export class PaymentoutDocModule { }
