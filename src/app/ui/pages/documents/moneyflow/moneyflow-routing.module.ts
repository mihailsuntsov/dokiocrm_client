import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MoneyflowComponent } from './moneyflow.component';

const routes: Routes = [{ path: '', component: MoneyflowComponent },
                        { path: ':company', component: MoneyflowComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MoneyflowRoutingModule { }
