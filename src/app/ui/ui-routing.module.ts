import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UiComponent } from './ui.component';

const routes: Routes = [
  { path: '', component: UiComponent,
    children:[
      { path: 'dashboard', loadChildren: () => import('src/app/ui/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'companies', loadChildren: () => import('./pages/documents/companies/companies.module').then(m => m.CompaniesModule) },
      { path: 'companiesdock', loadChildren: () => import('./pages/documents/companies-dock/companies-dock.module').then(m => m.CompaniesDockModule) },
      { path: 'files', loadChildren: () => import('./pages/documents/files/files.module').then(m => m.FilesModule) },
      { path: 'filesdock', loadChildren: () => import('./pages/documents/files-dock/files-dock.module').then(m => m.FilesDockModule) },
      { path: 'departments', loadChildren: () => import('./pages/documents/departments/departments.module').then(m => m.DepartmentsModule) },
      { path: 'departmentsdock', loadChildren: () => import('./pages/documents/departments-dock/departments-dock.module').then(m => m.DepartmentsDockModule) },
      { path: 'usersdock', loadChildren: () => import('./pages/documents/users-dock/users-dock.module').then(m => m.UsersDockModule) },
      { path: 'users', loadChildren: () => import('./pages/documents/users/users.module').then(m => m.UsersModule) },
      { path: 'usergroupdock', loadChildren: () => import('./pages/documents/usergroup-dock/usergroup-dock.module').then(m => m.UsergroupDockModule) },
      { path: 'usergroup', loadChildren: () => import('./pages/documents/usergroup/usergroup.module').then(m => m.UsergroupModule) },
      { path: 'traderesults-report', loadChildren: () => import('./pages/documents/traderesults-report/traderesults-report.module').then(m => m.TraderesultsReportModule) },
      { path: '', redirectTo: 'dashboard',pathMatch: 'full' },
    ]  
  },
  

  
]

@NgModule({
  imports: [RouterModule.forChild(routes)], 
  exports: [RouterModule]
})
export class UiRoutingModule { }
