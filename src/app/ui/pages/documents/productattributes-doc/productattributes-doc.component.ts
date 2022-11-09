import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute} from '@angular/router';
import { LoadSpravService } from '../../../../services/loadsprav';
import { UntypedFormGroup, Validators, UntypedFormControl, UntypedFormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from 'src/app/ui/dialogs/confirmdialog-with-custom-text.component';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { translate } from '@ngneat/transloco'; //+++
import { SlugifyPipe } from 'src/app/services/slugify.pipe';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProductAttributeTermsComponent } from 'src/app/modules/trade-modules/product-attribute-terms/product-attribute-terms.component';

interface docResponse {//интерфейс для получения ответа в методе getProductAttributeTableById
  id: number;
  company: string;
  company_id: number;
  creator: string;
  creator_id: number;
  master: string;
  master_id: number;
  changer:string;
  changer_id: number;
  date_time_changed: string;
  date_time_created: string;
  name: string;
  type: string;
  slug: string;
  order_by: string;
  has_archives: boolean;
  is_deleted: boolean;
}
interface AttributeTerm{
  id: number;
  name: string;
  description: string;
  slug: string;
  menu_order: number;
} 
interface IdAndName{ //универсалный интерфейс для выбора из справочников
  id: any;
  name: string;
}
@Component({
  selector: 'app-productattributes-doc',
  templateUrl: './productattributes-doc.component.html',
  styleUrls: ['./productattributes-doc.component.css'],
  providers: [LoadSpravService,SlugifyPipe]
})
export class ProductAttributeDocComponent implements OnInit {

  id: number = 0;// id документа
  createdDocId: string[];//массив для получение id созданного документа
  receivedCompaniesList: any [] = [];//массив для получения списка предприятий
  myCompanyId:number=0;
  myId:number=0;
  creatorId:number=0;
  receivedTermsList: AttributeTerm[] = [];
  //Формы
  formBaseInformation:any;//форма для основной информации, содержащейся в документе
  formAboutDocument:any;//форма, содержащая информацию о документе (создатель/владелец/изменён кем/когда)

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
  // productattributesList : productattributesList [] = []; //массив для получения всех статусов текущего документа
  
  @Output() baseData: EventEmitter<any> = new EventEmitter(); //+++ for get base datа from parent component (like myId, myCompanyId etc)

  constructor(
    private activateRoute: ActivatedRoute,
    private http: HttpClient,
    private productAttributeTermsDialog: MatDialog,
    private MessageDialog: MatDialog,
    private loadSpravService:   LoadSpravService,
    private _router:Router,
    public ConfirmDialog: MatDialog,
    private slugifyPipe: SlugifyPipe,
    private _snackBar: MatSnackBar) { 
      if(activateRoute.snapshot.params['id'])
        this.id = +activateRoute.snapshot.params['id'];// +null returns 0
    }

  ngOnInit() {
    this.formBaseInformation = new UntypedFormGroup({
      id: new UntypedFormControl              (this.id,[]),
      company_id: new UntypedFormControl      ('',[Validators.required]),
      name: new UntypedFormControl            ('',[Validators.required,Validators.maxLength(120)]),
      type: new UntypedFormControl            ('select',[]),
      slug: new UntypedFormControl            ('',[Validators.required,Validators.maxLength(120)]),
      order_by: new UntypedFormControl        ('menu_order',[]),
      has_archives: new UntypedFormControl    ('false',[]),
      is_deleted: new UntypedFormControl      ('false',[]),
      terms:  new UntypedFormControl          ([],[]),//массив с названиями термсов атрибута
    });
    this.formAboutDocument = new UntypedFormGroup({
      id: new UntypedFormControl                     ('',[]),
      master: new UntypedFormControl                 ('',[]),
      creator: new UntypedFormControl                ('',[]),
      changer: new UntypedFormControl                ('',[]),
      company: new UntypedFormControl                ('',[]),
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
    return this.http.get('/api/auth/getMyPermissions?id=53')
      .subscribe(
          (data) => {   
                      this.permissionsSet=data as any [];
                      this.getMyId();
      },
      error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}, //+++
      );
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

  getCRUD_rights(){
    this.allowToCreateAllCompanies = this.permissionsSet.some(         function(e){return(e==663)});
    this.allowToCreateMyCompany = this.permissionsSet.some(            function(e){return(e==664)});
    this.allowToViewAllCompanies = this.permissionsSet.some(           function(e){return(e==667)});
    this.allowToViewMyCompany = this.permissionsSet.some(              function(e){return(e==668)});
    this.allowToUpdateAllCompanies = this.permissionsSet.some(         function(e){return(e==669)});
    this.allowToUpdateMyCompany = this.permissionsSet.some(            function(e){return(e==670)});
    
    if(this.allowToCreateAllCompanies){this.allowToCreateMyCompany=true;}
    if(this.allowToViewAllCompanies){this.allowToViewMyCompany=true;}
    if(this.allowToUpdateAllCompanies){this.allowToUpdateMyCompany=true;}
    
    this.getData();
  }

  refreshPermissions(){
    let documentOfMyCompany:boolean = (this.formBaseInformation.get('company_id').value==this.myCompanyId);
    this.allowToView=((this.allowToViewAllCompanies)||(this.allowToViewMyCompany&&documentOfMyCompany))?true:false;
    this.allowToUpdate=((this.allowToUpdateAllCompanies)||(this.allowToUpdateMyCompany&&documentOfMyCompany))?true:false;
    this.allowToCreate=(this.allowToCreateAllCompanies || this.allowToCreateMyCompany)?true:false;
    
    this.rightsDefined=true;//!!!
    // console.log("myCompanyId - "+this.myCompanyId);
    // console.log("documentOfMyCompany - "+documentOfMyCompany);
    console.log("allowToView - "+this.allowToView);
    console.log("allowToUpdate - "+this.allowToUpdate);
    console.log("allowToCreate - "+this.allowToCreate);
  }
// -------------------------------------- *** КОНЕЦ ПРАВ *** ------------------------------------
  getData(){
    if(+this.id>0){
      this.getDocumentValuesById();
    }else {
      this.getCompaniesList();
    }
  }
  
  doFilterCompaniesList(){
    let myCompany:IdAndName;
    if(!this.allowToCreateAllCompanies){
      this.receivedCompaniesList.forEach(company=>{
      if(this.myCompanyId==company.id) myCompany={id:company.id, name:company.name}});
      this.receivedCompaniesList=[];
      this.receivedCompaniesList.push(myCompany);
    }
    if(+this.id==0)//!!!!! отсюда загружаем настройки только если документ новый. Если уже создан - настройки грузятся из get<Document>ValuesById
      this.setDefaultCompany();
  }

  setDefaultCompany(){
    if(this.id==0){
      this.formBaseInformation.get('company_id').setValue(this.myCompanyId);
    }
    this.refreshPermissions();
  }

  getDocumentValuesById(){
    this.http.get('/api/auth/getProductAttributeValuesById?id='+this.id)
        .subscribe(
            data => { 
              
                let documentValues: docResponse=data as any;// <- засовываем данные в интерфейс для принятия данных
                //Заполнение формы из интерфейса documentValues:
                //!!!
                if(data!=null&&documentValues.company_id!=null){
                  this.formBaseInformation.get('id').setValue(+documentValues.id);
                  this.formBaseInformation.get('company_id').setValue(+documentValues.company_id);
                  this.formBaseInformation.get('name').setValue(documentValues.name);
                  this.formBaseInformation.get('type').setValue(documentValues.type);
                  this.formBaseInformation.get('slug').setValue(documentValues.slug);
                  this.formBaseInformation.get('order_by').setValue(documentValues.order_by);
                  this.formBaseInformation.get('has_archives').setValue(documentValues.has_archives);
                  this.formBaseInformation.get('is_deleted').setValue(documentValues.is_deleted);
                  this.formAboutDocument.get('master').setValue(documentValues.master);
                  this.formAboutDocument.get('creator').setValue(documentValues.creator);
                  this.formAboutDocument.get('changer').setValue(documentValues.changer);
                  this.formAboutDocument.get('company').setValue(documentValues.company);
                  this.formAboutDocument.get('date_time_created').setValue(documentValues.date_time_created);
                  this.formAboutDocument.get('date_time_changed').setValue(documentValues.date_time_changed);
                  this.getProductAttributeTermsList();
                  
                } else {this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}})} //+++
                this.refreshPermissions();
            },
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})} //+++
        );
  }

  createNewDocument(){
    this.createdDocId=null;
    this.http.post('/api/auth/insertProductAttribute', this.formBaseInformation.value)
            .subscribe(
                (data) =>   {
                  switch(data){
                    case null:{// null возвращает если не удалось создать документ из-за ошибки
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.crte_doc_err',{name:translate('docs.docs.edizm')})}});
                      break;
                    }
                    case -1:{//недостаточно прав
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm_creat',{name:translate('docs.docs.edizm')})}});
                      break;
                    }
                    case -212:{//Неуникальный url-псевдоним (slug)
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.pc_cat_slug_uq')}});
                      break;
                    }
                    case -214:{//Неуникальное имя
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.pc_name_uq')}});
                      break;
                    }
                    default:{// Документ успешно создался в БД 
                      this.createdDocId=data as string [];
                      this.id=+this.createdDocId[0];
                      this.formBaseInformation.get('id').setValue(this.id);
                      this.afterCreateDoc();
                      this.openSnackBar(translate('docs.msg.doc_crtd_suc'),translate('docs.msg.close'));
                  }
                }
              },
              error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
            );
  }

  updateDocument(complete:boolean){ 
    this.formBaseInformation.get('terms').setValue(this.receivedTermsList);
      return this.http.post('/api/auth/updateProductAttribute', this.formBaseInformation.value)
        .subscribe(
            (data) => 
            {   
              switch(data){
                case null:{// null возвращает если не удалось сохранить документ из-за ошибки
                  this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.save_error')}});
                  break;
                }
                case -1:{//недостаточно прав
                  this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}});
                  break;
                }
                case -212:{//Неуникальный url-псевдоним (slug)
                  this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.pc_cat_slug_uq')}});
                  break;
                }
                case -214:{//Неуникальное имя
                  this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.pc_name_uq')}});
                  break;
                }
                default:{// Документ успешно создался в БД 
                this.getData();
                this.openSnackBar(translate('docs.msg.doc_sved_suc'),translate('docs.msg.close'));
              }
            }
          },
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
        );
  } 

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 3000,
    });
  }
  
  // Действия после создания нового документа Счёт покупателю (это самый последний этап).
  afterCreateDoc(){// с true запрос придет при отбиваемом в данный момент чеке
    // Сначала обживаем текущий документ:
    this.id=+this.createdDocId;
    this._router.navigate(['/ui/productattributesdoc', this.id]);
    this.formBaseInformation.get('id').setValue(this.id);
    this.rightsDefined=false; //!!!
    this.getData();
  }

  //создание нового документа
  goToNewDocument(){
    this._router.navigate(['ui/productattributesdoc',0]);
    this.id=0;
    this.formBaseInformation.get('id').setValue(null);
    this.formBaseInformation.get('name').setValue('');
    this.formBaseInformation.get('type').setValue('select');
    this.formBaseInformation.get('slug').setValue('');
    this.formBaseInformation.get('order_by').setValue('menu_order');
    this.getSetOfPermissions();//
  }


  getBaseData(data) {    //+++ emit data to parent component
    this.baseData.emit(data);
  }
  
  numberOnly(event): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;//т.к. IE использует event.keyCode, а остальные - event.which
    if (charCode > 31 && (charCode < 48 || charCode > 57)) { return false; } return true;}

  slugify(){
    this.formBaseInformation.get('slug').setValue(
      this.slugifyPipe.transform(this.formBaseInformation.get('name').value)
    );
  }

  getProductAttributeTermsList(){
    this.http.get('/api/auth/getProductAttributeTermsList?attribute_id='+this.id)
    .subscribe(
      (data) => {
        this.receivedTermsList=data as AttributeTerm [];
      },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }

  getMaxOrder(){
    let mo:number = 0;
    this.receivedTermsList.forEach(i => {
      mo = i.menu_order;
    });
    return mo;
  }

  dropTerm(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.receivedTermsList, event.previousIndex, event.currentIndex);
  }

  clickBtnAddTerm(): void {
    const dialogRef = this.productAttributeTermsDialog.open(ProductAttributeTermsComponent, {
      width: '800px', 
      data:
      { 
        actionType: "create",
        attribute_id: this.id,
        companyId: this.formBaseInformation.get('company_id').value,
        menu_order: this.getMaxOrder(),
        termName: '', 
        termId:'',
        termSlug:'',
        termDescription:'',
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log("createdTermId: "+result);
      this.getProductAttributeTermsList();
    });        
  }

  clickBtnEditTerm(termId:string,termName:string,termSlug:string,termDescription:string): void {
    const dialogRef = this.productAttributeTermsDialog.open(ProductAttributeTermsComponent, {
      width: '800px', 
      data:
      { 
        actionType:"update",
        attribute_id: this.id,
        termName: termName, 
        termId:termId,
        termSlug:termSlug,
        termDescription:termDescription,
        companyId: this.formBaseInformation.get('company_id').value,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      this.getProductAttributeTermsList();
    });        
  }


  clickBtnDeleteTerm(id: number): void {
    const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
      width: '400px',
      data:
      { 
        head:   translate('docs.msg.del_term'),
        query:  translate('docs.msg.del_term_f_attr'),
        warning:translate(''),
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result==1){this.deleteTerm(id);}
    });        
  }
  deleteTerm(termId:number){
    return this.http.get('/api/auth/deleteProductAttributeTerm?id='+termId)
    .subscribe(
        (data) => {  
          let result = data as any; 
          switch(result){
            case null:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.error_msg')}});break;}
            case -1:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.ne_perm')}});break;}
            default:{ 
              this.openSnackBar(translate('docs.msg.deletet_succs'), translate('docs.msg.close'));
              this.getProductAttributeTermsList();
            }
          }
        },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
    );  
  }


}
