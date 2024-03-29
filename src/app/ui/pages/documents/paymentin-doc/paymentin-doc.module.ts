import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentinDocRoutingModule } from './paymentin-doc-routing.module';
import { PaymentinDocComponent } from './paymentin-doc.component';
import { ValidationService } from './validation.service';
import { MaterialModule } from '../../../../modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsPaymentinDialogModule } from '../../../../modules/settings/settings-paymentin-dialog/settings-paymentin-dialog.module';
import { BalanceCagentModule } from 'src/app/modules/info-modules/balance/balance-cagent/balance-cagent.module';
import { BalanceBoxofficeModule } from 'src/app/modules/info-modules/balance/balance-boxoffice/balance-boxoffice.module';
import { BalanceAccountModule } from 'src/app/modules/info-modules/balance/balance-account/balance-account.module';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@ngneat/transloco';

@NgModule({
  declarations: [PaymentinDocComponent, /*ControlMessagesComponent*/],
  imports: [
    CommonModule,
    PaymentinDocRoutingModule,
    SettingsPaymentinDialogModule,
    BalanceCagentModule,
    BalanceAccountModule,
    BalanceBoxofficeModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoModule
  ],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: ['docs','menu','modules']},ValidationService],
})
export class PaymentinDocModule { }
