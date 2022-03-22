import { Component, OnInit } from '@angular/core';
import { TokenStorageService } from '../auth/token-storage.service';
import { HttpClient } from '@angular/common/http';
import { LoadSpravService } from '../services/loadsprav';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { TranslocoService } from '@ngneat/transloco';
import { UserSettingsDialogComponent } from 'src/app/modules/settings/user-settings-dialog/user-settings-dialog.component';
import { FormControl, FormGroup } from '@angular/forms';
import { filter } from 'rxjs/operators';

/** @title Fixed sidenav */
@Component({
  selector: 'app-ui',
  templateUrl: './ui.component.html',
  styleUrls: ['./ui.component.css'],
  providers: [LoadSpravService]
})
export class UiComponent implements OnInit {

  info: any;
  //переменные прав
  permissionsSet: any[] = [];//сет прав на документ
  userInfo: any;//информация о пользователе
  authorized:boolean=false;
  // localized:boolean=false;
  locale:string='en-us';// locale (for dates, calendar etc.)
  suffix:string='en';   // en es ru etc
  component:any;
  settingsForm: any; // form for settings
  isSettingsLoaded:boolean = false; // settigns must be loaded only once. After we need just send into router-outlet info about language & locale on every rout
  myId:number=null;
  myCompanyId:number=null;
  myDepartmentsList:any[]=[];
  companiesList:any[]=[];

  constructor(
    private token: TokenStorageService,
    private loadSpravService: LoadSpravService, 
    public MessageDialog: MatDialog,
    public UserSettingsDialogComponent: MatDialog,
    private _router:Router,
    private _snackBar: MatSnackBar,
    private http: HttpClient,
    private service: TranslocoService) {
     
  }
  
  ngOnInit() 
  {
    this.service.load('en').subscribe();
    this.service.events$.pipe(filter(event => event.type==='translationLoadSuccess'));
    // .subscribe(() => {
      // console.log(111)
      // setTimeout(() => { 
        // this.localized=true;
      // }, 1000);
      // 
    // });
    
    // Форма настроек
    this.settingsForm = new FormGroup({
      timeZoneId: new FormControl               (null,[]),            // user's timezone
      languageId: new FormControl               (null,[]),            // language of user interface
      localeId: new FormControl                 (null,[]),            // locale id (for dates, calendar etc.)
    });

    this.info = {
      token: this.token.getToken(),
      username: this.token.getUsername(),
      authorities: this.token.getAuthorities()
    };

    if(Cookie.get('dokio_token')){
      this.getAllMyPermissions();// -> getPermissions()
    }     
    else this._router.navigate(['/login']);
  }
  // when child component loaded - it gets locale and language from here
  onOutletLoaded(component) {
    this.component=component;







    if(this.isSettingsLoaded){
      this.setLanguage(this.suffix); // setting language in Transloco by suffixes like en es ru etc
      this.setLocale  (this.locale); // setting locale in moment.js
      // this.setMyId();
      // this.setMyCompanyId();
    } else {
      this.getSettings();
      this.getMyId();
      this.getMyCompanyId();
      this.getCompaniesList();
    }

    //Below will subscribe to the searchItem emitter
    component.baseData.subscribe((data) => {
       // Will receive the data from child here 
       let query=data as string;
       switch (query) {
        case 'myId': {
          component.myId=this.myId;;
          break;}
        case 'myCompanyId': {
          component.myCompanyId=this.myCompanyId;
          break;}
        case 'myDepartmentsList': {
          component.receivedMyDepartmentsList=this.myDepartmentsList;
          break;}
        case 'companiesList': {
          component.receivedCompaniesList=this.companiesList;
          break;}
      }
    })
    

  }
  
//   onActivate(component) {
//     console.log(component)
//     component.anyFunction();
//     //Below will subscribe to the searchItem emitter
//     alert(1)
//     component.searchItem.subscribe((data) => {
//       alert(11)
//        // Will receive the data from child here 
//        let query=data as string;
//        switch (query) {
//         case 'myId': {
//           component.myId=this.myId;;
//           break;}
//         case 'myCompanyId': {
//           component.myCompanyId=this.myCompanyId;
//           break;}
//       }
//     })
//  }

  setLanguage(lang: string) {
    this.service.setActiveLang(lang);    
  }
  setLocale(locale:string){
    try{ this.component._adapter.setLocale(locale);} catch (e) {console.log('There is no _adapter in this component')}
  }
  // setMyId(){
  //   try{ this.component._adapter.myId=this.myId;} catch (e) {console.log('Error on setting myId')}
  // }
  // setMyCompanyId(){
  //   try{ this.component._adapter.myCompanyId = this.myCompanyId;} catch (e) {console.log('Error on setting myCompanyId')}
  // }
  getAllMyPermissions()
  {
    // alert("getAllMyPermissions");
     this.http.post('/api/auth/getAllMyPermissions', {}) 
      .subscribe(
          (data) => {   
                      this.permissionsSet=data as any [];
                      this.authorized=true;// если запрос произошел без ошибки 401 (Unauthorized) - значит JWT-ключ еще не протух
                      this.getUserInfo(); 
                  },
                  error => {
                    console.log(error);
                    let errStatus= error.status ? `${error.status} - ${error.statusText}`:'';
                    let errMsg = (error.status=='401'||error.status=='401 - Unauthorized')?'Вы не авторизованы в системе':(error.message) ? error.message :'';
                    this.MessageDialog.open(MessageDialog,
                    {
                      width:'400px',
                      data:{
                        head:'Ошибка!',
                        message:'<p><b>Статус ошибки:</b> '+errStatus+'</p><p><b>Tекст ошибки:</b> '+errMsg+'</p>'
                      }
                    }).afterClosed().subscribe(
                        result => {
                          Cookie.set('dokio_token', '', -1, '/');
                          this.logout();
                        }
                    );
                  },
      );
  }
  hasPermission(permId:number):boolean
  {
    return this.permissionsSet.some(function(e){return(e==permId)})?true:false;
  }
  getUserInfo(){
    this.userInfo=this.loadSpravService.getMyShortInfo()
    .subscribe(
        (data) => {
          this.userInfo=data as any;
        },
        error => console.log(error)
    );
  }
  logout() 
  {
    this.token.signOut();
    window.location.reload();
  }

  arrowClick(e,parentLevel:number){
    let clickedElement = e.target;
    console.log(clickedElement);
    if(parentLevel==1)
      clickedElement.parentElement.classList.toggle("showMenu");
    if(parentLevel==2)
      clickedElement.parentElement.parentElement.classList.toggle("showMenu");
    if(parentLevel==3)
      clickedElement.parentElement.parentElement.parentElement.classList.toggle("showMenu");
  }

  menuClick(e){
    let sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("close");
  }
  
  // settings loading
  getSettings(){
    let result:any;
    this.http.get('/api/auth/getMySettings')
      .subscribe(
          data => { 
            result=data as any;
            //if user still have no settings - let's set default settings:
            this.settingsForm.get('timeZoneId').setValue((result.time_zone_id&&result.time_zone_id>0)?result.time_zone_id:21);// Europe, London (+0 GMT)
            this.settingsForm.get('languageId').setValue((result.language_id&&result.language_id>0)?result.language_id:1);// English
            this.settingsForm.get('localeId').setValue((result.locale_id&&result.locale_id>0)?result.locale_id:3);// en-us suffix
            this.locale=result.locale?result.locale:'en-us';// en-us
            this.suffix=result.suffix?result.suffix:'en';// suffix - at same time means language for Transloco

            this.setLanguage(this.suffix); // setting language in Transloco by suffixes like en es ru etc
            this.setLocale  (this.locale); // setting locale in moment.js
            this.isSettingsLoaded = true;
          },
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:'Ошибка!',message:error.error}})}
      );
  }

  //open settings dialog
  openDialogSettings() { 
    const dialogSettings = this.UserSettingsDialogComponent.open(UserSettingsDialogComponent, {
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: '400px', 
      minHeight: '350px',
      data:
      { //sending data to dialog:
        timeZoneId:   this.settingsForm.get('timeZoneId').value,
        languageId:   this.settingsForm.get('languageId').value,
        localeId:     this.settingsForm.get('localeId').value,
        // locale:       this.locale, 
        suffix:       this.suffix,
      },
    });
    dialogSettings.afterClosed().subscribe(result => {
      if(result){
        //если нажата кнопка Сохранить настройки - вставляем настройки в форму настроек и сохраняем
        if(result.get('timeZoneId')) this.settingsForm.get('timeZoneId').setValue(result.get('timeZoneId').value);
        if(result.get('languageId')) this.settingsForm.get('languageId').setValue(result.get('languageId').value);
        if(result.get('localeId')) this.settingsForm.get('localeId').setValue(result.get('localeId').value);
        this.saveUserSettings();
      }
    });
  }

  saveUserSettings(){
    return this.http.post('/api/auth/saveUserSettings', this.settingsForm.value)
            .subscribe(
                (data) => {   
                          this.getSettings();
                          this.openSnackBar("Настройки успешно сохранены", "Закрыть");
                        },
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:'Ошибка!',message:error.error}})},
            );
  }
  getMyId(){
    this.loadSpravService.getMyId()
    .subscribe((data) => {this.myId=data as number;/*this.setMyId();*/},error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:'Ошибка!',message:error.error}})});
  }
  getMyCompanyId(){
    this.loadSpravService.getMyCompanyId().subscribe(
    (data) => {this.myCompanyId=data as number;
      /*this.setMyCompanyId();*/
      this.getMyDepartmentsList()
    },error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:'Ошибка!',message:error.error}})});
  }
  getCompaniesList(){
    this.loadSpravService.getCompaniesList()
      .subscribe((data) => {this.companiesList=data as any [];},error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:'Ошибка!',message:error.error}})});
  }
  getMyDepartmentsList(){
    this.loadSpravService.getMyDepartmentsListByCompanyId(this.myCompanyId,false)
      .subscribe((data) => {this.myDepartmentsList=data as any [];},error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:'Ошибка!',message:error.error}})});
  }
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 3000,
    });
  }

}


