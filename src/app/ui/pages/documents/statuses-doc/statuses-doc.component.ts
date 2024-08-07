import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute} from '@angular/router';
import { LoadSpravService } from '../../../../services/loadsprav';
import { UntypedFormGroup, Validators, UntypedFormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { Router } from '@angular/router';
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { translate } from '@ngneat/transloco'; //+++

interface docResponse {//интерфейс для получения ответа в методе getStatusDocsTableById
  id: number;
  company: string;
  company_id: number;
  document: string;
  document_id: number;
  creator: string;
  creator_id: number;
  master: string;
  master_id: number;
  changer:string;
  changer_id: number;
  date_time_changed: string;
  date_time_created: string;
  name: string;
  description: string;
  color: string;
  doc_id: number;
  doc: string;
  status_type: number;//тип статуса 1 - обычный; 2 - конечный положительный 3 - конечный отрицательный
}
interface statusesList {//интерфейс массива для получения всех статусов текущего документа
  id: string;
  name: string;
  output_order: string;
}
interface idAndName{ //универсалный интерфейс для выбора из справочников
  id: number;
  name: string;
}

@Component({
  selector: 'app-statuses-doc',
  templateUrl: './statuses-doc.component.html',
  styleUrls: ['./statuses-doc.component.css'],
  providers: [LoadSpravService,]
})
export class StatusesDocComponent implements OnInit {

  companySettings:any={booking_doc_name_variation:'reservation'};
  id: number = 0;// id документа
  createdDocId: string[];//массив для получение id созданного документа
  receivedCompaniesList: any [] = [];//массив для получения списка предприятий
  receivedDocumentsList: idAndName [] = [];//массив для получения списка отделений
  myCompanyId:number=0;
  myId:number=0;
  creatorId:number=0;
  
  //Формы
  formBaseInformation:any;//форма для основной информации, содержащейся в документе
  formAboutDocument:any;//форма, содержащая информацию о документе (создатель/владелец/изменён кем/когда)

  //переменные для управления динамическим отображением элементов
  visBeforeCreatingBlocks = true; //блоки, отображаемые ДО создания документа (до получения id)
  visAfterCreatingBlocks = true; //блоки, отображаемые ПОСЛЕ создания документа (id >0)
  visBtnUpdate = false;
  visBtnAdd:boolean;
  visBtnCopy = false;
  visBtnDelete = false;

  //переменные прав
  permissionsSet: any[];//сет прав на документ
  allowToViewAllCompanies:boolean = false;
  allowToViewMyCompany:boolean = false;
  allowToUpdateAllCompanies:boolean = false;
  allowToUpdateMyCompany:boolean = false;
  allowToCreateMyCompany:boolean = false;
  allowToCreateAllCompanies:boolean = false;
  allowToView:boolean = false;
  allowToUpdate:boolean = false;
  allowToCreate:boolean = false;
  rightsDefined:boolean; // определены ли права !!!


  statusColor: string;
  statusesList : statusesList [] = []; //массив для получения всех статусов текущего документа

  @Output() baseData: EventEmitter<any> = new EventEmitter(); //+++ for get base datа from parent component (like myId, myCompanyId etc)
  
  constructor(
    private activateRoute: ActivatedRoute,
    private http: HttpClient,
    private MessageDialog: MatDialog,
    private loadSpravService:   LoadSpravService,
    private _router:Router,
    private _snackBar: MatSnackBar) { 
      if(activateRoute.snapshot.params['id'])
        this.id = +activateRoute.snapshot.params['id'];// +null returns 0
    }

  ngOnInit() {
    this.formBaseInformation = new UntypedFormGroup({
      id: new UntypedFormControl      (this.id,[]),
      company_id: new UntypedFormControl      ('',[Validators.required]),
      // statusesIdsInOrderOfList:new FormControl      ([],[]),//массив для формирования необходимого порядка вывода статусов
      name: new UntypedFormControl      ('',[Validators.required]),
      description: new UntypedFormControl      ('',[]),
      color: new UntypedFormControl      ('#d0d0d0',[Validators.required]),
      doc_id: new UntypedFormControl      (0,[Validators.required]),
      doc:new UntypedFormControl      ('',[]),
      status_type: new UntypedFormControl      (1,[Validators.required]),//тип статуса 1 - обычный; 2 - конечный положительный 3 - конечный отрицательный
    });
    this.formAboutDocument = new UntypedFormGroup({
      id: new UntypedFormControl      ('',[]),
      master: new UntypedFormControl      ('',[]),
      creator: new UntypedFormControl      ('',[]),
      changer: new UntypedFormControl      ('',[]),
      company: new UntypedFormControl      ('',[]),
      date_time_created: new UntypedFormControl      ('',[]),
      date_time_changed: new UntypedFormControl      ('',[]),
    });

    this.getSetOfPermissions();
    //+++ getting base data from parent component
    this.getBaseData('myId');    
    this.getBaseData('myCompanyId');  
    this.getBaseData('companiesList');
  }
//---------------------------------------------------------------------------------------------------------------------------------------                            
// ----------------------------------------------------- *** ПРАВА *** ------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------------------

  getSetOfPermissions(){
    return this.http.get('/api/auth/getMyPermissions?id=22')
      .subscribe(
          (data) => {   
                      this.permissionsSet=data as any [];
                      this.getMyId();
                  },
                  error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}, //+++
                  );
  }

  getCRUD_rights(){
    this.allowToCreateAllCompanies = this.permissionsSet.some(         function(e){return(e==271)});
    this.allowToCreateMyCompany = this.permissionsSet.some(            function(e){return(e==272)});
    this.allowToViewAllCompanies = this.permissionsSet.some(           function(e){return(e==275)});
    this.allowToViewMyCompany = this.permissionsSet.some(              function(e){return(e==276)});
    this.allowToUpdateAllCompanies = this.permissionsSet.some(         function(e){return(e==277)});
    this.allowToUpdateMyCompany = this.permissionsSet.some(            function(e){return(e==278)});
    this.getDocumentsList();
  }

  refreshPermissions():boolean{//!!!
    let documentOfMyCompany:boolean = (+this.formBaseInformation.get('company_id').value==this.myCompanyId);
    this.allowToView=(
      (this.allowToViewAllCompanies)||
      (this.allowToViewMyCompany&&documentOfMyCompany)
    )?true:false;
    this.allowToUpdate=(
      (this.allowToUpdateAllCompanies)||
      (this.allowToUpdateMyCompany&&documentOfMyCompany)
    )?true:false;
    this.allowToCreate=(this.allowToCreateAllCompanies || this.allowToCreateMyCompany)?true:false;
    // console.log("myCompanyId - "+this.myCompanyId);
    // console.log("documentOfMyCompany - "+documentOfMyCompany);
    // console.log("allowToView - "+this.allowToView);
    // console.log("allowToUpdate - "+this.allowToUpdate);
    // console.log("allowToCreate - "+this.allowToCreate);
    // return true;
    this.rightsDefined=true;//!!!
    return true;
  }
// -------------------------------------- *** КОНЕЦ ПРАВ *** ------------------------------------
  getData(){
    if(+this.id>0){
      this.getDocumentValuesById();
    }else {
      this.getCompaniesList();
    }
  }
  getCompanySettings(){
    this.http.get('/api/auth/getCompanySettings?id='+this.formBaseInformation.get('company_id').value).subscribe(data => {this.companySettings = data as any;},error => {console.log(error);});
  }
  onCompanySelection(){
    this.getCompanySettings();
  }
  refreshShowAllTabs(){
    if(this.id>0){//если в документе есть id
      this.visAfterCreatingBlocks = true;
      this.visBeforeCreatingBlocks = false;
      this.visBtnUpdate = this.allowToUpdate;
    }else{
      this.visAfterCreatingBlocks = false;
      this.visBeforeCreatingBlocks = true;
    }
  }
  getCompaniesList(){ //+++
    if(this.receivedCompaniesList.length==0)
      this.loadSpravService.getCompaniesList()
        .subscribe(
            (data) => 
            {
              this.receivedCompaniesList=data as any [];
              this.doFilterCompaniesList();
            },                      
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
        );
    else this.doFilterCompaniesList();
  }
  getMyId(){ //+++
    if(+this.myId==0)
      this.loadSpravService.getMyId()
            .subscribe(
                (data) => {this.myId=data as any;
                  this.getMyCompanyId();},
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
            );
    else this.getMyCompanyId();
  }
  getMyCompanyId(){ //+++
    if(+this.myCompanyId==0)
      this.loadSpravService.getMyCompanyId().subscribe(
        (data) => {
          this.myCompanyId=data as number;
          this.getCRUD_rights();
        }, error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})});
    else this.getCRUD_rights();
  }

  setDefaultCompany(){
    if(this.receivedDocumentsList.length>1)
    {
      if(this.allowToCreateAllCompanies)
        this.formBaseInformation.get('company_id').setValue(Cookie.get('satusdoc_companyId')=="0"?this.myCompanyId:+Cookie.get('satusdoc_companyId'));
      else
        this.formBaseInformation.get('company_id').setValue(this.myCompanyId);
    } else {
      this.formBaseInformation.get('company_id').setValue(this.myCompanyId);
    }
    this.setDefaultDocument();
    this.getCompanySettings();
  }

  getDocumentsList(){
    this.receivedDocumentsList=this.loadSpravService.getDocumentsList();
    this.getData();
  }

  setDefaultDocument(){
    console.log('Document length = '+this.receivedDocumentsList.length);
    if(this.receivedDocumentsList.length>1)
    {
      this.formBaseInformation.get('doc_id').setValue(Cookie.get('satusdoc_documentId')=="0"?this.receivedDocumentsList[0].id:+Cookie.get('satusdoc_documentId'))
    //} else {
      //this.formBaseInformation.get('doc_id').setValue(+this.receivedDocumentsList[0].id);
      //Cookie.set('satusdoc_documentId',this.formBaseInformation.get('doc_id').value);
    }
    this.refreshPermissions();
  }
  
  doFilterCompaniesList(){
    let myCompany:idAndName;
    if(!this.allowToCreateAllCompanies){
      this.receivedCompaniesList.forEach(company=>{
      if(this.myCompanyId==company.id) myCompany={id:company.id, name:company.name}});
      this.receivedCompaniesList=[];
      this.receivedCompaniesList.push(myCompany);
    }
    this.setDefaultCompany();
  }

  getDocumentValuesById(){
    const docId = {"id": this.id};
    this.http.post('/api/auth/getSpravStatusDocsValuesById', docId)
        .subscribe(
            data => { 
              
                let documentValues: docResponse=data as any;// <- засовываем данные в интерфейс для принятия данных
                //Заполнение формы из интерфейса documentValues:
                //!!!
                if(data!=null&&documentValues.company_id!=null){
                  this.formBaseInformation.get('id').setValue(+documentValues.id);
                  this.formBaseInformation.get('company_id').setValue(+documentValues.company_id);
                  this.formBaseInformation.get('doc_id').setValue(+documentValues.doc_id);
                  this.formBaseInformation.get('doc').setValue(documentValues.doc);
                  this.formBaseInformation.get('color').setValue(documentValues.color);
                  this.formBaseInformation.get('name').setValue(documentValues.name);
                  this.formBaseInformation.get('description').setValue(documentValues.description);
                  this.formBaseInformation.get('status_type').setValue(+documentValues.status_type);
                  this.formAboutDocument.get('master').setValue(documentValues.master);
                  this.formAboutDocument.get('creator').setValue(documentValues.creator);
                  this.formAboutDocument.get('changer').setValue(documentValues.changer);
                  this.formAboutDocument.get('company').setValue(documentValues.company);
                  this.formAboutDocument.get('date_time_created').setValue(documentValues.date_time_created);
                  this.formAboutDocument.get('date_time_changed').setValue(documentValues.date_time_changed);
                  this.getStatusesList();
                  this.getCompanySettings();
                  
                } else {this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}})} //+++
                this.refreshPermissions();
            },
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})} //+++
        );
  }

  createNewDocument(){
    this.http.post('/api/auth/insertSpravStatusDocs', this.formBaseInformation.value)
    .subscribe((data) => {   
      let result=data as any;
      switch(result){
        case null:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.error_msg')}});break;}
        case -1:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}});break;}
        default:{
          this.id=result;
          this.afterCreateDoc();
          this.openSnackBar(translate('docs.msg.doc_crtd_suc'),translate('docs.msg.close'));
          break;
        } 
      }
    },error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},);
  }

  updateDocument(){ 
    const body= {
      "id":                       this.formBaseInformation.get('id').value,
      "doc_id":                  this.formBaseInformation.get('doc_id').value,
      "company_id":               this.formBaseInformation.get('company_id').value,
      "name":                     this.formBaseInformation.get('name').value,
      "description":              this.formBaseInformation.get('description').value,
      "color":                    this.formBaseInformation.get('color').value,
      "status_type":              this.formBaseInformation.get('status_type').value,
      "statusesIdsInOrderOfList": this.getStatusesIdsInOrderOfList()
    }
      return this.http.post('/api/auth/updateSpravStatusDocs', body)
        
    .subscribe((data) => {   
      let result=data as any;
      switch(result){
        case 1:{this.getData(); this.openSnackBar(translate('docs.msg.doc_sved_suc'),translate('docs.msg.close'));break;} 
        case null:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.error_msg')}});break;}
        case -1:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.ne_perm')}});break;}
      }
    },error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},);
  }

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 3000,
    });
  }

  getStatusesList(){//возвращает список всех статусов документа, который нужен для изменения порядка вывода статусов
    const body = {  searchString: '', 
      sortColumn:'output_order', 
      offset:'0', 
      sortAsc:'asc', 
      result:'1000',
      filterOptionsIds:[],
      companyId: this.formBaseInformation.get('company_id').value,
      documentId: this.formBaseInformation.get('doc_id').value};
      return this.http.post('/api/auth/getStatusDocsTable', body)
            .subscribe(
                (data) => {
                  this.statusesList = data as any [];
                  this.refreshPermissions(); 
                },
                error => console.log(error) 
            );
  }

  getStatusesIdsInOrderOfList(): number[] {
    var i: number []=[];
    this.statusesList.forEach(x => {
      i.push(+x.id);
    })
    return i;
  }

  dropCagent(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.statusesList, event.previousIndex, event.currentIndex);
  }

  
  // Действия после создания нового документа Счёт покупателю (это самый последний этап).
  afterCreateDoc(){// с true запрос придет при отбиваемом в данный момент чеке
    // Сначала обживаем текущий документ:
    this.rightsDefined=false; //!!!
    this._router.navigate(['/ui/statusesdoc', this.id]);
    this.formBaseInformation.get('id').setValue(this.id);
    this.getData();
  }

  //создание нового документа
  goToNewDocument(){
    this._router.navigate(['ui/statusesdoc']);
    this.id=0;
    this.formBaseInformation.get('id').setValue(null);
    this.formBaseInformation.get('name').setValue('');
    this.formBaseInformation.get('color').setValue('#d0d0d0');
    this.formBaseInformation.get('status_type').setValue(1);
    this.statusesList=[];
    this.getData();
  }
  getBaseData(data) {    //+++ emit data to parent component
    this.baseData.emit(data);
  }


}
