import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UiComponent } from './ui.component';

const routes: Routes = [
  { path: '', component: UiComponent,
    children:[
      { path: 'dashboard', loadChildren: () => import('src/app/ui/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'companies', loadChildren: () => import('./pages/documents/companies/companies.module').then(m => m.CompaniesModule) },
      { path: 'companiesdoc', loadChildren: () => import('./pages/documents/companies-doc/companies-doc.module').then(m => m.CompaniesDocModule) },
      { path: 'files', loadChildren: () => import('./pages/documents/files/files.module').then(m => m.FilesModule) },
      { path: 'filesdoc', loadChildren: () => import('./pages/documents/files-doc/files-doc.module').then(m => m.FilesDocModule) },
      { path: 'departments', loadChildren: () => import('./pages/documents/departments/departments.module').then(m => m.DepartmentsModule) },
      { path: 'departmentsdoc', loadChildren: () => import('./pages/documents/departments-doc/departments-doc.module').then(m => m.DepartmentsDocModule) },
      { path: 'usersdoc', loadChildren: () => import('./pages/documents/users-doc/users-doc.module').then(m => m.UsersDocModule) },
      { path: 'users', loadChildren: () => import('./pages/documents/users/users.module').then(m => m.UsersModule) },
      { path: 'usergroupdoc', loadChildren: () => import('./pages/documents/usergroup-doc/usergroup-doc.module').then(m => m.UsergroupDocModule) },
      { path: 'usergroup', loadChildren: () => import('./pages/documents/usergroup/usergroup.module').then(m => m.UsergroupModule) },
      { path: 'traderesults-report', loadChildren: () => import('./pages/documents/traderesults-report/traderesults-report.module').then(m => m.TraderesultsReportModule) },
      { path: 'productgroupsdoc', loadChildren: () => import('./pages/documents/productgroups-doc/productgroups-doc.module').then(m => m.ProductgroupsDocModule) },
      { path: 'productgroups', loadChildren: () => import('./pages/documents/productgroups/productgroups.module').then(m => m.ProductgroupsModule) },
      { path: 'edizmdoc', loadChildren: () => import('./pages/documents/edizm-doc/edizm-doc.module').then(m => m.EdizmDocModule) },
      { path: 'edizm', loadChildren: () => import('./pages/documents/edizm/edizm.module').then(m => m.EdizmModule) },
      { path: 'cagentsdoc', loadChildren: () => import('./pages/documents/cagents-doc/cagents-doc.module').then(m => m.CagentsDocModule) },
      { path: 'cagents', loadChildren: () => import('./pages/documents/cagents/cagents.module').then(m => m.CagentsModule) },
      { path: 'pricetypesdoc', loadChildren: () => import('./pages/documents/pricetypes-doc/pricetypes-doc.module').then(m => m.PricetypesDocModule) },
      { path: 'pricetypes', loadChildren: () => import('./pages/documents/pricetypes/pricetypes.module').then(m => m.PricetypesModule) },
      { path: 'statusesdoc', loadChildren: () => import('./pages/documents/statuses-doc/statuses-doc.module').then(m => m.StatusesDocModule) },
      { path: 'statuses', loadChildren: () => import('./pages/documents/statuses/statuses.module').then(m => m.StatusesModule) },
      { path: 'productsdoc', loadChildren: () => import('./pages/documents/products-doc/products-doc.module').then(m => m.ProductsDocModule) },
      { path: 'products', loadChildren: () => import('./pages/documents/products/products.module').then(m => m.ProductsModule) },
      { path: 'traderesultsdoc', loadChildren: () => import('./pages/documents/traderesults-doc/traderesults-doc.module').then(m => m.TraderesultsDocModule) },
      { path: 'traderesults', loadChildren: () => import('./pages/documents/traderesults/traderesults.module').then(m => m.TraderesultsModule) },
      { path: 'remains', loadChildren: () => import('./pages/documents/remains/remains.module').then(m => m.RemainsModule) },
      { path: 'prices', loadChildren: () => import('./pages/documents/prices/prices.module').then(m => m.PricesModule) },
      { path: 'customersordersdoc', loadChildren: () => import('./pages/documents/customersorders-doc/customersorders-doc.module').then(m => m.CustomersordersDocModule) },
      { path: 'customersorders', loadChildren: () => import('./pages/documents/customersorders/customersorders.module').then(m => m.CustomersordersModule) },
      { path: 'shipmentdoc', loadChildren: () => import('./pages/documents/shipment-doc/shipment-doc.module').then(m => m.ShipmentDocModule) },
      { path: 'acceptancedoc', loadChildren: () => import('./pages/documents/acceptance-doc/acceptance-doc.module').then(m => m.AcceptanceDocModule) },
      { path: 'postingdoc', loadChildren: () => import('./pages/documents/posting-doc/posting-doc.module').then(m => m.PostingDocModule) },
      { path: 'writeoffdoc', loadChildren: () => import('./pages/documents/writeoff-doc/writeoff-doc.module').then(m => m.WriteoffDocModule) },
      { path: 'shipment', loadChildren: () => import('./pages/documents/shipment/shipment.module').then(m => m.ShipmentModule) },
      { path: 'acceptance', loadChildren: () => import('./pages/documents/acceptance/acceptance.module').then(m => m.AcceptanceModule) },
      { path: 'posting', loadChildren: () => import('./pages/documents/posting/posting.module').then(m => m.PostingModule) },
      { path: 'writeoff', loadChildren: () => import('./pages/documents/writeoff/writeoff.module').then(m => m.WriteoffModule) },
      { path: 'kassa', loadChildren: () => import('./pages/documents/kassa/kassa.module').then(m => m.KassaModule) },
      { path: 'kassadoc', loadChildren: () => import('./pages/documents/kassa-doc/kassa-doc.module').then(m => m.KassaDocModule) },
      { path: 'retailsales', loadChildren: () => import('./pages/documents/retailsales/retailsales.module').then(m => m.RetailsalesModule) },
      { path: 'retailsalesdoc', loadChildren: () => import('./pages/documents/retailsales-doc/retailsales-doc.module').then(m => m.RetailsalesDocModule) },
      { path: 'inventory', loadChildren: () => import('./pages/documents/inventory/inventory.module').then(m => m.InventoryModule) },
      { path: 'inventorydoc', loadChildren: () => import('./pages/documents/inventory-doc/inventory-doc.module').then(m => m.InventoryDocModule) },
      { path: 'returndoc', loadChildren: () => import('./pages/documents/return-doc/return-doc.module').then(m => m.ReturnDocModule) },
      { path: 'return', loadChildren: () => import('./pages/documents/return/return.module').then(m => m.ReturnModule) },
      { path: 'returnsupdoc', loadChildren: () => import('./pages/documents/returnsup-doc/returnsup-doc.module').then(m => m.ReturnsupDocModule) },
      { path: 'returnsup', loadChildren: () => import('./pages/documents/returnsup/returnsup.module').then(m => m.ReturnsupModule) },
      { path: 'moving', loadChildren: () => import('./pages/documents/moving/moving.module').then(m => m.MovingModule) },
      { path: 'movingdoc', loadChildren: () => import('./pages/documents/moving-doc/moving-doc.module').then(m => m.MovingDocModule) },
      { path: 'invoiceout', loadChildren: () => import('./pages/documents/invoiceout/invoiceout.module').then(m => m.InvoiceoutModule) },
      { path: 'invoiceoutdoc', loadChildren: () => import('./pages/documents/invoiceout-doc/invoiceout-doc.module').then(m => m.InvoiceoutDocModule) },
      { path: 'ordersupdoc', loadChildren: () => import('./pages/documents/ordersup-doc/ordersup-doc.module').then(m => m.OrdersupDocModule) },
      { path: 'ordersup', loadChildren: () => import('./pages/documents/ordersup/ordersup.module').then(m => m.OrdersupModule) },
      { path: 'invoiceindoc', loadChildren: () => import('./pages/documents/invoicein-doc/invoicein-doc.module').then(m => m.InvoiceinDocModule) },
      { path: 'invoicein', loadChildren: () => import('./pages/documents/invoicein/invoicein.module').then(m => m.InvoiceinModule) },
      { path: 'paymentindoc', loadChildren: () => import('./pages/documents/paymentin-doc/paymentin-doc.module').then(m => m.PaymentinDocModule) },
      { path: 'paymentin', loadChildren: () => import('./pages/documents/paymentin/paymentin.module').then(m => m.PaymentinModule) },
      { path: 'orderindoc', loadChildren: () => import('./pages/documents/orderin-doc/orderin-doc.module').then(m => m.OrderinDocModule) },
      { path: 'orderin', loadChildren: () => import('./pages/documents/orderin/orderin.module').then(m => m.OrderinModule) },
      { path: 'vatinvoiceoutdoc', loadChildren: () => import('./pages/documents/vatinvoiceout-doc/vatinvoiceout-doc.module').then(m => m.VatinvoiceoutDocModule) },
      { path: 'vatinvoiceout', loadChildren: () => import('./pages/documents/vatinvoiceout/vatinvoiceout.module').then(m => m.VatinvoiceoutModule) },
      { path: 'expenditure', loadChildren: () => import('./pages/documents/expenditure/expenditure.module').then(m => m.ExpenditureModule) },
      { path: 'expendituredoc', loadChildren: () => import('./pages/documents/expenditure-doc/expenditure-doc.module').then(m => m.ExpenditureDocModule) },
      { path: 'paymentout', loadChildren: () => import('./pages/documents/paymentout/paymentout.module').then(m => m.PaymentoutModule) },
      { path: 'paymentoutdoc', loadChildren: () => import('./pages/documents/paymentout-doc/paymentout-doc.module').then(m => m.PaymentoutDocModule) },
      { path: 'orderoutdoc', loadChildren: () => import('./pages/documents/orderout-doc/orderout-doc.module').then(m => m.OrderoutDocModule) },
      { path: 'orderout', loadChildren: () => import('./pages/documents/orderout/orderout.module').then(m => m.OrderoutModule) },
      { path: 'vatinvoiceindoc', loadChildren: () => import('./pages/documents/vatinvoicein-doc/vatinvoicein-doc.module').then(m => m.VatinvoiceinDocModule) },
      { path: 'vatinvoicein', loadChildren: () => import('./pages/documents/vatinvoicein/vatinvoicein.module').then(m => m.VatinvoiceinModule) },
      { path: 'boxoffice', loadChildren: () => import('./pages/documents/boxoffice/boxoffice.module').then(m => m.BoxofficeModule) },
      { path: 'boxofficedoc', loadChildren: () => import('./pages/documents/boxoffice-doc/boxoffice-doc.module').then(m => m.BoxofficeDocModule) },
      { path: 'correction', loadChildren: () => import('./pages/documents/correction/correction.module').then(m => m.CorrectionModule) },
      { path: 'correctiondoc', loadChildren: () => import('./pages/documents/correction-doc/correction-doc.module').then(m => m.CorrectionDocModule) },
      { path: '', redirectTo: 'dashboard',pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard',pathMatch: 'full' },
    ]  
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)], 
  exports: [RouterModule]
})
export class UiRoutingModule { }
