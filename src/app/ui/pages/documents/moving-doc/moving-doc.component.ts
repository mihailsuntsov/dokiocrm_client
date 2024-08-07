import { ChangeDetectorRef, Component, EventEmitter, Inject, OnInit, Optional, Output, ViewChild} from '@angular/core';
import { ActivatedRoute} from '@angular/router';
import { LoadSpravService } from '../../../../services/loadsprav';
import { UntypedFormGroup, UntypedFormArray,  UntypedFormBuilder,  Validators, UntypedFormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialog } from 'src/app/ui/dialogs/confirmdialog-with-custom-text.component';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SettingsMovingDialogComponent } from 'src/app/modules/settings/settings-moving-dialog/settings-moving-dialog.component';
import { MovingProductsTableComponent } from 'src/app/modules/trade-modules/moving-products-table/moving-products-table.component';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { Router } from '@angular/router';
import { FilesComponent } from '../files/files.component';
import { FilesDocComponent } from '../files-doc/files-doc.component';
import { v4 as uuidv4 } from 'uuid';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { graphviz }  from 'd3-graphviz';
import { translate } from '@ngneat/transloco'; //+++

import { MomentDefault } from 'src/app/services/moment-default';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
const MY_FORMATS = MomentDefault.getMomentFormat();
const moment = MomentDefault.getMomentDefault();

interface MovingProductTable { //интерфейс для товаров, (т.е. для формы, массив из которых будет содержать форма movingProductTable, входящая в formBaseInformation)
  id: number;                     // id строки с товаром товара в таблице return_product
  row_id: number;                 // id строки 
  product_id: number;             // id товара 
  name: string;                   // наименование товара
  edizm: string;                  // наименование единицы измерения
  product_price: number;          // цена товара
  product_count: number;          // кол-во товара
  // department_id: number;          // склад
  remains: number;                // остаток на складе
  product_sumprice: number;       // сумма как product_count * product_price (высчитываем сумму и пихем ее в БД, чтобы потом на бэкэнде в SQL запросах ее не высчитывать)
  product_netcost: number;        // себестоимость за ед. товара

}

interface DocResponse {//интерфейс для получения ответа в методе getMovingValuesById
  id: number;
  company: string;
  company_id: string;
  department_from: string;
  department_to: string;
  department_from_id: string;
  department_to_id: string;
  creator: string;
  creator_id: string;
  master: string;
  master_id: string;
  is_completed: boolean;
  changer:string;
  changer_id: string;
  doc_number: string;
  // moving_date: string;
  date_time_changed: string;
  date_time_created: string;
  description : string;
  is_archive: boolean;
  status_id: number;
  status_name: string;
  status_color: string;
  status_description: string;
  overhead: string;
  overhead_netcost_method: number;
  uid:string;
}
interface FilesInfo {
  id: string;
  name: string;
  original_name: string;
  date_time_created: string;
}
interface IdAndName{ //универсалный интерфейс для выбора из справочников
  id: number;
  name: string;
}
interface IdNameDescription{
  id: number;
  name: string;
  description: string;
}
interface IdAndNameAndShortname{ //универсалный интерфейс для выбора из справочников
  id: string;
  name: string;
  short_name: string;
}
interface StatusInterface{
  id:number;
  name:string;
  status_type:number;//тип статуса: 1 - обычный; 2 - конечный положительный 3 - конечный отрицательный
  output_order:number;
  color:string;
  description:string;
  is_default:boolean;
}
interface LinkedDocs {//интерфейс для загрузки связанных документов
  id:number;
  doc_number:number;
  date_time_created:string;
  description:string;
  is_completed:boolean;
}
interface CanCreateLinkedDoc{//интерфейс ответа на запрос о возможности создания связанного документа
  can:boolean;
  reason:string;
}

@Component({
  selector: 'app-moving-doc',
  templateUrl: './moving-doc.component.html',
  styleUrls: ['./moving-doc.component.css'],
  providers: [LoadSpravService,
    { provide: DateAdapter, useClass: MomentDateAdapter,deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]}, //+++
    {provide: MAT_DATE_FORMATS, useValue: MY_FORMATS},
  ]
})
export class MovingDocComponent implements OnInit {

  id: number = 0;// id документа
  createdDocId: number;//получение id созданного документа
  receivedCompaniesList: IdAndName [];//массив для получения списка предприятий
  receivedDepartmentsList: IdAndName [] = [];//массив для получения списка отделений
  receivedStatusesList: StatusInterface [] = []; // массив для получения статусов
  receivedMyDepartmentsList: IdAndName [] = [];//массив для получения списка отделений
  accountingCurrency='';// short name of Accounting currency of user's company (e.g. $ or EUR)
  myCompanyId:number=0;
  myId:number=0;
  // allFields: any[][] = [];//[номер строки начиная с 0][объект - вся инфо о товаре (id,кол-во, цена... )] - массив товаров
  filesInfo : FilesInfo [] = []; //массив для получения информации по прикрепленным к документу файлам 
  creatorId:number=0;
  startProcess: boolean=true; // идеут стартовые запросы. после того как все запросы пройдут - будет false.
  canGetChilds: boolean=false; //можно ли грузить дочерние модули
  actionsBeforeGetChilds:number=0;// количество выполненных действий, необходимых чтобы загрузить дочерние модули (кассу и форму товаров)
  spravSysEdizmOfProductAll: IdAndNameAndShortname[] = [];// массив, куда будут грузиться все единицы измерения товара
  receivedPriceTypesList: IdNameDescription [] = [];//массив для получения списка типов цен
  displayedColumns:string[];//отображаемые колонки таблицы с товарами
  canEditCompAndDepth=true;
  // panelMovingOpenState=false;
  // panelMovingOpenState=false;
  mode: string = 'standart';  // режим работы документа: standart - обычный режим, window - оконный режим просмотра

  //для загрузки связанных документов
  linkedDocsReturn:LinkedDocs[]=[];
  panelReturnOpenState=false;

  // Формы
  formAboutDocument:any;//форма, содержащая информацию о документе (создатель/владелец/изменён кем/когда)
  formBaseInformation: UntypedFormGroup; //массив форм для накопления информации о Возврате поставщику
  settingsForm: any; // форма с настройками
  formReturnsup:any// Форма для отправки при создании Возврата поставщику

  //переменные для управления динамическим отображением элементов
  // visAfterCreatingBlocks = true; //блоки, отображаемые ПОСЛЕ создания документа (id >0)

  //переменные прав
  permissionsSet: any[];//сет прав на документ
  allowToViewAllCompanies:boolean = false;
  allowToViewMyCompany:boolean = false;
  allowToViewMyDepartments:boolean = false;
  allowToViewMyDocs:boolean = false;
  allowToUpdateAllCompanies:boolean = false;
  allowToUpdateMyCompany:boolean = false;
  allowToUpdateMyDepartments:boolean = false;
  allowToUpdateMyDocs:boolean = false;
  allowToCreateMyCompany:boolean = false;
  allowToCreateAllCompanies:boolean = false;
  allowToCreateMyDepartments:boolean = false;
  allowToCompleteAllCompanies:boolean = false;
  allowToCompleteMyCompany:boolean = false;
  allowToCompleteMyDepartments:boolean = false;
  allowToCompleteMyDocs:boolean = false;
  allowToView:boolean = false;
  allowToUpdate:boolean = false;
  allowToComplete:boolean = false;
  allowToCreate:boolean = false;
  showOpenDocIcon:boolean=false;
  editability:boolean = false;//редактируемость. true если есть право на создание и документ создаётся, или есть право на редактирование и документ создан

  rightsDefined:boolean; // определены ли права !!!
  lastCheckedDocNumber:string=''; //!!!

  isDocNumberUnicalChecking = false;//идёт ли проверка на уникальность номера
  doc_number_isReadOnly=true;
  @ViewChild("doc_number", {static: false}) doc_number; //для редактирования номера документа
  @ViewChild("form", {static: false}) form; // связь с формой <form #form="ngForm" ...
  @ViewChild(MovingProductsTableComponent, {static: false}) public movingProductsTableComponent:MovingProductsTableComponent;
  @Output() baseData: EventEmitter<any> = new EventEmitter(); //+++ for get base datа from parent component (like myId, myCompanyId etc)

  constructor(private activateRoute: ActivatedRoute,
    private cdRef:ChangeDetectorRef,
    private _fb: UntypedFormBuilder, //чтобы билдить группу форм movingProductTable
    private http: HttpClient,
    public ConfirmDialog: MatDialog,
    public dialogAddFiles: MatDialog,
    public SettingsMovingDialogComponent: MatDialog,
    public dialogCreateProduct: MatDialog,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    public MessageDialog: MatDialog,
    private loadSpravService:   LoadSpravService,
    private _snackBar: MatSnackBar,
    private _router:Router,
    private _adapter: DateAdapter<any>) 
    { 
      if(activateRoute.snapshot.params['id'])
        this.id = +activateRoute.snapshot.params['id'];
    }

  ngOnInit(): void {
    this.formBaseInformation = new UntypedFormGroup({
      id: new UntypedFormControl      (this.id,[]),
      company_id: new UntypedFormControl         ('',[Validators.required]),
      department_from_id: new UntypedFormControl ('',[Validators.required]),
      department_to_id: new UntypedFormControl   ('',[Validators.required]),
      doc_number: new UntypedFormControl         ('',[Validators.maxLength(10),Validators.pattern('^[0-9]{1,10}$')]),
      // moving_date: new FormControl        ('',[Validators.required]),
      description: new UntypedFormControl        ('',[]),
      department_from: new UntypedFormControl    ('',[]),
      department_to: new UntypedFormControl      ('',[]),
      status_id: new UntypedFormControl          ('',[]),
      status_name: new UntypedFormControl        ('',[]),
      status_color: new UntypedFormControl       ('',[]),
      status_description: new UntypedFormControl ('',[]),
      is_completed: new UntypedFormControl       (false,[]),
      overhead: new UntypedFormControl           ('',[Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,2})?\r?$')]),
      overhead_netcost_method: new UntypedFormControl      (0,[]),
      uid: new UntypedFormControl                ('',[]),
      movingProductTable: new UntypedFormArray   ([])
    });
    this.formAboutDocument = new UntypedFormGroup({
      id: new UntypedFormControl                       ('',[]),
      master: new UntypedFormControl                   ('',[]),
      creator: new UntypedFormControl                  ('',[]),
      changer: new UntypedFormControl                  ('',[]),
      company: new UntypedFormControl                  ('',[]),
      date_time_created: new UntypedFormControl        ('',[]),
      date_time_changed: new UntypedFormControl        ('',[]),
    });

    // Форма настроек
    this.settingsForm = new UntypedFormGroup({
      // предприятие, для которого создаются настройки
      companyId: new UntypedFormControl                (null,[]),
      // id отделения из
      departmentFromId: new UntypedFormControl             (null,[]),
      // id отделения в
      departmentToId: new UntypedFormControl             (null,[]),
      // тип расценки. priceType - по типу цены, avgCostPrice - средн. себестоимость, lastPurchasePrice - Последняя закупочная цена, avgPurchasePrice - Средняя закупочная цена, manual - вручную
      pricingType: new UntypedFormControl              ('avgCostPrice',[]), // по умолчанию ставим "Средняя закупочная цена"
      // тип цены
      priceTypeId: new UntypedFormControl              (null,[]),
      // наценка или скидка. В чем выражается (валюта или проценты) - определяет changePriceType
      changePrice: new UntypedFormControl              (0,[Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,2})?\r?$')]), // по умолчанию "плюс 10%"
      // Наценка (plus) или скидка (minus)
      plusMinus: new UntypedFormControl                ('plus',[]),
      // выражение наценки (валюта или проценты): currency - валюта, procents - проценты
      changePriceType: new UntypedFormControl          ('procents',[]),
      // убрать десятые (копейки)
      hideTenths: new UntypedFormControl               (true,[]),
      // статус после проведения инвентаризации
      statusOnFinishId: new UntypedFormControl         ('',[]),
      // автодобавление товара из формы поиска в таблицу
      autoAdd:  new UntypedFormControl                 (false,[]),
    });

    if(this.data)//если документ вызывается в окне из другого документа
    {
      this.mode=this.data.mode;
      if(this.mode=='window'){this.id=this.data.id; this.formBaseInformation.get('id').setValue(this.id);}
    } 
    this.getSetOfPermissions();
    //+++ getting base data from parent component
    this.getBaseData('myId');    
    this.getBaseData('myCompanyId');  
    this.getBaseData('companiesList');  
    this.getBaseData('myDepartmentsList');    
    this.getBaseData('accountingCurrency');  
  }
  //чтобы не было ExpressionChangedAfterItHasBeenCheckedError
  ngAfterContentChecked() {
    this.cdRef.detectChanges();
  }
  //чтобы "на лету" чекать валидность таблицы с товарами
  get childFormValid() {
    // проверяем, чтобы не было ExpressionChangedAfterItHasBeenCheckedError. Т.к. форма создается пустая и с .valid=true, а потом уже при заполнении проверяется еще раз.
    if(this.movingProductsTableComponent!=undefined) 
      return this.movingProductsTableComponent.getControlTablefield().valid;
    else return true;    
  }

  //---------------------------------------------------------------------------------------------------------------------------------------                            
  // ----------------------------------------------------- *** ПРАВА *** ------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------------------

  getSetOfPermissions(){
    return this.http.get('/api/auth/getMyPermissions?id=30') //Перемещение = 30 в document_id
      .subscribe(
          (data) => {   
                      this.permissionsSet=data as any [];
                      this.getMyId();
                  },
                  error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}, //+++
                  );
  }

  refreshPermissions(){
    let documentOfMyCompany:boolean = (this.formBaseInformation.get('company_id').value==this.myCompanyId);
    let documentOfMyDepartments:boolean = (this.inMyDepthsId(+this.formBaseInformation.get('department_from_id').value) && this.inMyDepthsId(+this.formBaseInformation.get('department_to_id').value));
    this.allowToView=(
      (this.allowToViewAllCompanies)||
      (this.allowToViewMyCompany&&documentOfMyCompany)||
      (this.allowToViewMyDepartments&&documentOfMyCompany&&documentOfMyDepartments)||
      (this.allowToViewMyDocs&&documentOfMyCompany&&documentOfMyDepartments&&(this.myId==this.creatorId))
    )?true:false;
    this.allowToUpdate=(
      (this.allowToUpdateAllCompanies)||
      (this.allowToUpdateMyCompany&&documentOfMyCompany)||
      (this.allowToUpdateMyDepartments&&documentOfMyCompany&&documentOfMyDepartments)||
      (this.allowToUpdateMyDocs&&documentOfMyCompany&&documentOfMyDepartments&&(this.myId==this.creatorId))
    )?true:false;
    this.allowToComplete=(
      (this.allowToCompleteAllCompanies)||
      (this.allowToCompleteMyCompany&&documentOfMyCompany)||
      (this.allowToCompleteMyDepartments&&documentOfMyCompany&&documentOfMyDepartments)||
      (this.allowToCompleteMyDocs&&documentOfMyCompany&&documentOfMyDepartments&&(this.myId==this.creatorId))
    )?true:false;
    this.allowToCreate=(this.allowToCreateAllCompanies || this.allowToCreateMyCompany||this.allowToCreateMyDepartments)?true:false;
    
    this.editability=((this.allowToCreate && +this.id==0)||(this.allowToUpdate && this.id>0));
    this.rightsDefined=true;//!!!
    this.necessaryActionsBeforeGetChilds();
  }

//-------------------------------------------------------------------------------
  //нужно загруить всю необходимую информацию, прежде чем вызывать детей (Поиск и добавление товара, Кассовый модуль), иначе их ngOnInit выполнится быстрее, чем загрузится вся информация в родителе
  //вызовы из:
  //getPriceTypesList()*
  //refreshPermissions()
  necessaryActionsBeforeGetChilds(){
    this.actionsBeforeGetChilds++;
    //Если набрано необходимое кол-во действий для отображения модуля Формы поиска и добавления товара
    if(this.actionsBeforeGetChilds==2){
      this.canGetChilds=true;
      this.startProcess=false;// все стартовые запросы прошли
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
          this.getMyDepartmentsList();
        }, error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})});
    else this.getMyDepartmentsList();
  }
  getMyDepartmentsList(){ //+++
    if(this.receivedMyDepartmentsList.length==0)
    this.loadSpravService.getMyDepartmentsListByCompanyId(this.myCompanyId,false)
            .subscribe(
                (data) => {this.receivedMyDepartmentsList=data as any [];
                  this.getCRUD_rights();},
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
            );
    else this.getCRUD_rights();
  }

  getCRUD_rights(){
    this.allowToCreateAllCompanies = this.permissionsSet.some(         function(e){return(e==377)});
    this.allowToCreateMyCompany = this.permissionsSet.some(            function(e){return(e==378)});
    this.allowToCreateMyDepartments = this.permissionsSet.some(        function(e){return(e==379)});
    this.allowToViewAllCompanies = this.permissionsSet.some(           function(e){return(e==384)});
    this.allowToViewMyCompany = this.permissionsSet.some(              function(e){return(e==385)});
    this.allowToViewMyDepartments = this.permissionsSet.some(          function(e){return(e==386)});
    this.allowToViewMyDocs = this.permissionsSet.some(                 function(e){return(e==387)});
    this.allowToUpdateAllCompanies = this.permissionsSet.some(         function(e){return(e==388)});
    this.allowToUpdateMyCompany = this.permissionsSet.some(            function(e){return(e==389)});
    this.allowToUpdateMyDepartments = this.permissionsSet.some(        function(e){return(e==390)});
    this.allowToUpdateMyDocs = this.permissionsSet.some(               function(e){return(e==391)});
    this.allowToCompleteAllCompanies = this.permissionsSet.some(       function(e){return(e==392)});
    this.allowToCompleteMyCompany = this.permissionsSet.some(          function(e){return(e==393)});
    this.allowToCompleteMyDepartments = this.permissionsSet.some(      function(e){return(e==394)});
    this.allowToCompleteMyDocs = this.permissionsSet.some(             function(e){return(e==395)});
   
    if(this.allowToCreateAllCompanies){this.allowToCreateMyCompany=true;this.allowToCreateMyDepartments=true}
    if(this.allowToCreateMyCompany)this.allowToCreateMyDepartments=true;
    if(this.allowToViewAllCompanies){this.allowToViewMyCompany=true;this.allowToViewMyDepartments=true;this.allowToViewMyDocs=true}
    if(this.allowToViewMyCompany){this.allowToViewMyDepartments=true;this.allowToViewMyDocs=true}
    if(this.allowToViewMyDepartments)this.allowToViewMyDocs=true;
    if(this.allowToUpdateAllCompanies){this.allowToUpdateMyCompany=true;this.allowToUpdateMyDepartments=true;this.allowToUpdateMyDocs=true;}
    if(this.allowToUpdateMyCompany){this.allowToUpdateMyDepartments=true;this.allowToUpdateMyDocs=true;}
    if(this.allowToUpdateMyDepartments)this.allowToUpdateMyDocs=true;
    if(this.allowToCompleteAllCompanies){this.allowToCompleteMyCompany=true;this.allowToCompleteMyDepartments=true;this.allowToCompleteMyDocs=true;}
    if(this.allowToCompleteMyCompany){this.allowToCompleteMyDepartments=true;this.allowToCompleteMyDocs=true;}
    if(this.allowToCompleteMyDepartments)this.allowToCompleteMyDocs=true;
    this.getData();
  }

  getData(){
    if(+this.id>0){
      this.getDocumentValuesById();
    }else {
      this.getCompaniesList(); 
      // this.setDefaultDate();
    }
  }

  onCompanyChange(){
    this.formBaseInformation.get('department_from_id').setValue(null);
    this.formBaseInformation.get('department_to_id').setValue(null);
    this.formBaseInformation.get('status_id').setValue(null);
    this.actionsBeforeGetChilds=0;
    this.getDepartmentsList();
    this.getPriceTypesList();
    this.getStatusesList();
  }

  onDepartmentChange(){
      this.formBaseInformation.get('department_from').setValue(this.getDepartmentNameById(this.formBaseInformation.get('department_from_id').value));
      this.formBaseInformation.get('department_to').setValue(this.getDepartmentNameById(this.formBaseInformation.get('department_to_id').value));
  }

  getDepartmentsList(){
    this.receivedDepartmentsList=null;
    this.loadSpravService.getDepartmentsListByCompanyId(this.formBaseInformation.get('company_id').value,false)
      .subscribe(
          (data) => {this.receivedDepartmentsList=data as any [];
            this.doFilterDepartmentsList();
            if(+this.id==0) this.setDefaultDepartment();
          },
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
      );
  }
  setDefaultDepartment(){
    //если в настройках не было отделения, и в списке предприятий только одно предприятие - ставим его по дефолту
    if(+this.formBaseInformation.get('department_from_id').value==0 && this.receivedDepartmentsList.length==1){
      this.formBaseInformation.get('department_from_id').setValue(this.receivedDepartmentsList[0].id);
      //Если дочерние компоненты уже загружены - устанавливаем предприятие по дефолту как склад в форме поиска и добавления товара !!!!!!!!
      // if(!this.startProcess){
      //   this.movingProductsTableComponent.formSearch.get('secondaryDepartmentId').setValue(this.formBaseInformation.get('department_id').value);  
      //   this.movingProductsTableComponent.setCurrentTypePrice();//если сменили отделение - нужно проверить, есть ли у него тип цены. И если нет - в вызываемом методе выведется предупреждение для пользователя
      // }
    }
    if(+this.formBaseInformation.get('department_to_id').value==0 && this.receivedDepartmentsList.length==1){
      this.formBaseInformation.get('department_to_id').setValue(this.receivedDepartmentsList[0].id);
      //Если дочерние компоненты уже загружены - устанавливаем предприятие по дефолту как склад в форме поиска и добавления товара !!!!!!!!
      // if(!this.startProcess){
      //   this.movingProductsTableComponent.formSearch.get('secondaryDepartmentId').setValue(this.formBaseInformation.get('department_id').value);  
      //   this.movingProductsTableComponent.setCurrentTypePrice();//если сменили отделение - нужно проверить, есть ли у него тип цены. И если нет - в вызываемом методе выведется предупреждение для пользователя
      // }
    }
    //если отделение было выбрано (через настройки или же в этом методе) - определяем его наименование (оно будет отправляться в дочерние компоненты)
    if(+this.formBaseInformation.get('department_from_id').value>0)
      this.formBaseInformation.get('department_from').setValue(this.getDepartmentNameById(this.formBaseInformation.get('department_from_id').value));
    if(+this.formBaseInformation.get('department_to_id').value>0)
      this.formBaseInformation.get('department_to').setValue(this.getDepartmentNameById(this.formBaseInformation.get('department_to_id').value));
    //если идет стартовая прогрузка - продолжаем цепочку запросов. Если это была, например, просто смена предприятия - продолжать далее текущего метода смысла нет
    if(this.startProcess) {
      this.getStatusesList();
      this.checkAnyCases();
    }
  }
   // проверки на различные случаи
  checkAnyCases(){
    //проверка на то, что отделение все еще числится в отделениях предприятия (не было удалено и т.д.)
    if(!this.inDepthsId(+this.formBaseInformation.get('department_from_id').value)){
      this.formBaseInformation.get('department_from_id').setValue(null);
    }
    if(!this.inDepthsId(+this.formBaseInformation.get('department_to_id').value)){
      this.formBaseInformation.get('department_to_id').setValue(null);
    }
    //проверка на то, что отделение подходит под ограничения прав (если можно создавать только по своим отделениям, но выбрано отделение, не являющееся своим - устанавливаем null в выбранное id отделения)
    if(!this.allowToCreateAllCompanies && !this.allowToCreateMyCompany && this.allowToCreateMyDepartments){
      if(!this.inMyDepthsId(+this.formBaseInformation.get('department_from_id').value)){
        this.formBaseInformation.get('department_from_id').setValue(null);
      }
    }
    if(!this.allowToCreateAllCompanies && !this.allowToCreateMyCompany && this.allowToCreateMyDepartments){
      if(!this.inMyDepthsId(+this.formBaseInformation.get('department_to_id').value)){
        this.formBaseInformation.get('department_to_id').setValue(null);
      }
    }
    if(this.startProcess) this.refreshPermissions();
  }
  getStatusesList(){
    this.receivedStatusesList=null;
    this.loadSpravService.getStatusList(this.formBaseInformation.get('company_id').value,30) //30 - id документа Перемещение в таблице documents
            .subscribe(
                (data) => {this.receivedStatusesList=data as StatusInterface[];
                  if(+this.id==0){this.setDefaultStatus();}},
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
            );
  }

  setDefaultStatus(){
    if(this.receivedStatusesList.length>0)
    {
      this.receivedStatusesList.forEach(a=>{
          if(a.is_default){
            this.formBaseInformation.get('status_id').setValue(a.id);
          }
      });
    }
    this.setStatusColor();
    this.getSpravSysEdizm(); //загрузка единиц измерения. Загружаем тут, т.к. нужно чтобы сначала определилось предприятие, его id нужен для загрузки
  }

  getSpravSysEdizm():void {    
    let companyId=+this.formBaseInformation.get('company_id').value;
    this.http.post('/api/auth/getSpravSysEdizm', {id1: companyId, string1:"(1,2,3,4,5,6)"})  // все типы ед. измерения
    .subscribe((data) => {this.spravSysEdizmOfProductAll = data as any[];
            },
    error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})});
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
      this.getSettings();
  }
  doFilterDepartmentsList(){
    if(!this.allowToCreateAllCompanies && !this.allowToCreateMyCompany && this.allowToCreateMyDepartments){
      this.receivedDepartmentsList=this.receivedMyDepartmentsList;}
  }
  inMyDepthsId(id:number):boolean{//проверяет, состоит ли присланный id в группе id отделений пользователя
    let inMyDepthsId:boolean = false;
    this.receivedMyDepartmentsList.forEach(myDepth =>{
      myDepth.id==id?inMyDepthsId=true:null;
    });
  return inMyDepthsId;
  }
  inDepthsId(id:number):boolean{//проверяет, состоит ли присланный id в группе id отделений предприятия
    let inDepthsId:boolean = false;
    
    this.receivedDepartmentsList.forEach(depth =>{
      console.log("depth.id - "+depth.id+", id - "+id)
      depth.id==id?inDepthsId=true:null;
      console.log("inDepthsId - "+inDepthsId);
    });
    console.log("returning inDepthsId - "+inDepthsId);
  return inDepthsId;
  }

  //загрузка настроек
  getSettings(){
    let result:any;
    this.http.get('/api/auth/getSettingsMoving')
      .subscribe(
          data => { 
            result=data as any;
            //вставляем настройки в форму настроек
            
            //данная группа настроек не зависит от предприятия
            this.settingsForm.get('pricingType').setValue(result.pricingType?result.pricingType:'avgCostPrice');
            this.settingsForm.get('plusMinus').setValue(result.plusMinus?result.plusMinus:'plus');
            this.settingsForm.get('changePrice').setValue(result.changePrice?result.changePrice:0);
            this.settingsForm.get('changePriceType').setValue(result.changePriceType?result.changePriceType:'procents');
            this.settingsForm.get('hideTenths').setValue(result.hideTenths);
            this.settingsForm.get('autoAdd').setValue(result.autoAdd);
            //если предприятия из настроек больше нет в списке предприятий (например, для пользователя урезали права, и выбранное предприятие более недоступно)
            //необходимо их не загружать
            if(this.isCompanyInList(+result.companyId)){
              //данная группа настроек зависит от предприятия
              this.settingsForm.get('companyId').setValue(result.companyId);
              this.settingsForm.get('departmentFromId').setValue(result.departmentFromId);
              this.settingsForm.get('departmentToId').setValue(result.departmentToId);
              this.settingsForm.get('statusOnFinishId').setValue(result.statusOnFinishId);
              this.settingsForm.get('priceTypeId').setValue(result.priceTypeId);
            }
            this.setDefaultInfoOnStart();
            this.setDefaultCompany();
          },
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
      );
  }
  setDefaultCompany(){
    if(+this.formBaseInformation.get('company_id').value==0)//если в настройках не было предприятия - ставим своё по дефолту
      this.formBaseInformation.get('company_id').setValue(this.myCompanyId);
    this.getDepartmentsList(); 
    this.getPriceTypesList();
  }

  //определяет, есть ли предприятие в загруженном списке предприятий
  isCompanyInList(companyId:number):boolean{
    let inList:boolean=false;
    if(this.receivedCompaniesList) // иначе если док создан (id>0), т.е. списка предприятий нет, и => ERROR TypeError: Cannot read property 'map' of null
      this.receivedCompaniesList.map(i=>{if(i.id==companyId) inList=true;});
    return inList;
  }

  //если новый документ
  setDefaultInfoOnStart(){
    if(+this.id==0){//документ новый
      this.formBaseInformation.get('company_id').setValue(this.settingsForm.get('companyId').value)
      this.formBaseInformation.get('department_from_id').setValue(this.settingsForm.get('departmentFromId').value);
      this.formBaseInformation.get('department_to_id').setValue(this.settingsForm.get('departmentToId').value);
    }
  }

  getDocumentValuesById(){
    this.http.get('/api/auth/getMovingValuesById?id='+ this.id)
        .subscribe(
            data => { 
                let documentValues: DocResponse=data as any;// <- засовываем данные в интерфейс для принятия данных
                //!!!
                if(data!=null&&documentValues.company_id!=null){
                  this.formBaseInformation.get('id').setValue(+documentValues.id);
                  this.formBaseInformation.get('company_id').setValue(documentValues.company_id);
                  this.formBaseInformation.get('department_from_id').setValue(documentValues.department_from_id);
                  this.formBaseInformation.get('department_to_id').setValue(documentValues.department_to_id);
                  this.formBaseInformation.get('department_from').setValue(documentValues.department_from);
                  this.formBaseInformation.get('department_to').setValue(documentValues.department_to);
                  // this.formBaseInformation.get('moving_date').setValue(documentValues.moving_date?moment(documentValues.moving_date,'DD.MM.YYYY'):"");
                  this.formBaseInformation.get('doc_number').setValue(documentValues.doc_number);
                  this.formBaseInformation.get('description').setValue(documentValues.description);
                  this.formBaseInformation.get('overhead').setValue(documentValues.overhead);//расходы на перемещение, накладные расходы
                  this.formBaseInformation.get('overhead_netcost_method').setValue(documentValues.overhead_netcost_method);//распределение расходов на перемещение по товарам 0 - нет, 1 - по весу цены в перемещении
                  this.formAboutDocument.get('master').setValue(documentValues.master);
                  this.formAboutDocument.get('creator').setValue(documentValues.creator);
                  this.formAboutDocument.get('changer').setValue(documentValues.changer);
                  this.formAboutDocument.get('company').setValue(documentValues.company);
                  this.formAboutDocument.get('date_time_created').setValue(documentValues.date_time_created);
                  this.formAboutDocument.get('date_time_changed').setValue(documentValues.date_time_changed);
                  this.formBaseInformation.get('status_id').setValue(documentValues.status_id);
                  this.formBaseInformation.get('status_name').setValue(documentValues.status_name);
                  this.formBaseInformation.get('status_color').setValue(documentValues.status_color);
                  this.formBaseInformation.get('status_description').setValue(documentValues.status_description);
                  this.formBaseInformation.get('is_completed').setValue(documentValues.is_completed);
                  this.formBaseInformation.get('uid').setValue(documentValues.uid);
                  this.creatorId=+documentValues.creator_id;
                  this.getCompaniesList(); // загрузка списка предприятий (здесь это нужно для передачи его в настройки)
                  this.getPriceTypesList();
                  this.loadFilesInfo();
                  this.getDepartmentsList();//отделения
                  this.getStatusesList();//статусы документа Перемещение
                } else {this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}})} //+++
                this.refreshPermissions();
            },
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})} //+++
        );
  }

  formingProductRowFromApiResponse(row: MovingProductTable) {
    return this._fb.group({
      id: new UntypedFormControl (row.id,[]),
      product_id:         new UntypedFormControl (row.product_id,[]),
      moving_id:          new UntypedFormControl (this.id,[]),
      product_count:      new UntypedFormControl ((+row.product_count),[]),
      product_price:      new UntypedFormControl ((+row.product_price).toFixed(2),[]),
      product_sumprice:   new UntypedFormControl ((+row.product_count*(+row.product_price)).toFixed(2),[]),
      product_netcost:    new UntypedFormControl ((+row.product_netcost).toFixed(2),[]),
    });
  }
  
  EditDocNumber(): void {
    if(this.allowToUpdate && +this.id==0){
      const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
        width: '400px',
        data:
        { 
          head: translate('docs.msg.doc_num_head'),
          query: translate('docs.msg.doc_num_query'),
          warning: translate('docs.msg.doc_num_warn')
        },
      });
      dialogRef.afterClosed().subscribe(result => {
        if(result==1){
          this.doc_number_isReadOnly = false ;
          setTimeout(() => { this.doc_number.nativeElement.focus(); }, 500);}
      });  
    } 
  }

  checkDocNumberUnical(tableName:string) { //+++
    let docNumTmp=this.formBaseInformation.get('doc_number').value;
    setTimeout(() => {
      if(!this.formBaseInformation.get('doc_number').errors && this.lastCheckedDocNumber!=docNumTmp && docNumTmp!='' && docNumTmp==this.formBaseInformation.get('doc_number').value)
        {
          let Unic: boolean;
          this.isDocNumberUnicalChecking=true;
          this.lastCheckedDocNumber=docNumTmp;
          return this.http.get('/api/auth/isDocumentNumberUnical?company_id='+this.formBaseInformation.get('company_id').value+'&doc_number='+this.formBaseInformation.get('doc_number').value+'&doc_id='+this.id+'&table='+tableName)
          .subscribe(
              (data) => {   
                          Unic = data as boolean;
                          if(!Unic)this.MessageDialog.open(MessageDialog,{width:'400px',data:{head: translate('docs.msg.attention'),message: translate('docs.msg.num_not_unic'),}});
                          this.isDocNumberUnicalChecking=false;
                      },
              error => {console.log(error);this.isDocNumberUnicalChecking=false;}
          );
        }
    }, 1000);
  }


  //создание нового документа Перемещение
  createNewDocument(){
    // console.log('Создание нового документа Перемещение');
    this.createdDocId=null;
    this.formBaseInformation.get('uid').setValue(uuidv4());
    this.getProductsTable();
    this.http.post('/api/auth/insertMoving', this.formBaseInformation.value)
      .subscribe(
      (data) => {
                  this.actionsBeforeGetChilds=0;
                  this.createdDocId=data as number;
                  switch(this.createdDocId){
                    case null:{// null возвращает если не удалось создать документ из-за ошибки
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.crte_doc_err',{name:translate('docs.docs.moving')})}});
                      break;
                    }
                    case 0:{//недостаточно прав
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm_creat',{name:translate('docs.docs.moving')})}});
                      break;
                    }
                    case -240:{//Есть услуги
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.there_services')}});
                      break;
                    }
                    default:{// Списание успешно создалась в БД 
                      this.openSnackBar(translate('docs.msg.doc_crtd_suc'),translate('docs.msg.close'));
                      this.afterCreateMoving();
                    }
                  }
                },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
      );
  }

  //действия после создания нового документа Инвентаризиция
  afterCreateMoving(){
      this.id=+this.createdDocId;
      this._router.navigate(['/ui/movingdoc', this.id]);
      this.formBaseInformation.get('id').setValue(this.id);
      this.rightsDefined=false; //!!!
      this.getData();
  }

  completeDocument(notShowDialog?:boolean){ //+++
    if(!notShowDialog){
      const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
        width: '400px',data:{
          head:    translate('docs.msg.complet_head'),
          warning: translate('docs.msg.complet_warn'),
          query:   translate('docs.msg.complet_query')},});
      dialogRef.afterClosed().subscribe(result => {
        if(result==1){
          this.updateDocument(true);
        }
      });
    } else this.updateDocument(true);
  }

  decompleteDocument(notShowDialog?:boolean){ //+++
    if(this.allowToComplete){
      if(!notShowDialog){
        const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
          width: '400px',data:{
          head:    translate('docs.msg.cnc_com_head'),
          warning: translate('docs.msg.cnc_com_warn'),
          query: ''},});
        dialogRef.afterClosed().subscribe(result => {
          if(result==1){
            this.setDocumentAsDecompleted();
          }
        });
      } else this.setDocumentAsDecompleted();
    }
  }

  setDocumentAsDecompleted(){
    this.getProductsTable();    
    this.http.post('/api/auth/setMovingAsDecompleted',  this.formBaseInformation.value)
      .subscribe(
          (data) => 
          {   
            let result:number=data as number;
            switch(result){
              case null:{// null возвращает если не удалось завершить операцию из-за ошибки
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.cnc_com_error')}});
                break;
              }
              case -1:{//недостаточно прав
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}});
                break;
              }
              case 0:{// недостаточно товара на складе
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_prod_movng')}});
                break;
              }
              case -60:{//Документ уже снят с проведения
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.alr_cnc_com')}});
                break;
              }
              case -70:{//Отрицательное кол-во товара в истории движения товара
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.cnc_com_err1')}});
                break;
              }
              case -80:{//Отрицательное кол-во товара на складе
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.minus_on_dprt')}});
                break;
              }
              case 1:{// Успешно
                this.openSnackBar(translate('docs.msg.cnc_com_succs',{name:translate('docs.docs.moving')}), translate('docs.msg.close'));
                // this.getLinkedDocsScheme(true);//загрузка диаграммы связанных документов
                this.formBaseInformation.get('is_completed').setValue(false);
                // this.balanceCagentComponent.getBalance();//пересчитаем баланс поставщика, ведь мы приняли ему товар, и теперь он должен больше 
                // this.balanceCagentComponent.getBalance();//пересчитаем баланс поставщика
                if(this.movingProductsTableComponent){
                  this.movingProductsTableComponent.showColumns(); //чтобы показать столбцы после отмены проведения 
                  this.movingProductsTableComponent.getProductsTable();
                }
              }
            }
          },
          error => {
            this.showQueryErrorMessage(error);
          },
      );
  }
  updateDocument(complete?:boolean){ 
    this.getProductsTable();    
    let currentStatus:number=this.formBaseInformation.get('status_id').value;
    if(complete){
      if(this.movingProductsTableComponent.getProductTable().length==0){
        // this.oneClickSaveControl=false;
        this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.no_prods')}});      
        return;
      }
      this.formBaseInformation.get('is_completed').setValue(true);//если сохранение с проведением - временно устанавливаем true, временно - чтобы это ушло в запросе на сервер, но не повлияло на внешний вид документа, если вернется не true
      if(this.settingsForm.get('statusOnFinishId').value&&this.statusIdInList(this.settingsForm.get('statusOnFinishId').value)){// если в настройках есть "Статус при проведении" - временно выставляем его
        this.formBaseInformation.get('status_id').setValue(this.settingsForm.get('statusOnFinishId').value);}
    }
    this.http.post('/api/auth/updateMoving',  this.formBaseInformation.value)
      .subscribe(
          (data) => 
          {   
            if(complete){
              this.formBaseInformation.get('is_completed').setValue(false);//если сохранение с проведением - удаляем временную установку признака проведённости, 
              this.formBaseInformation.get('status_id').setValue(currentStatus);//и возвращаем предыдущий статус
            }
            let result:number=data as number;
            switch(result){
              case null:{// null возвращает если не удалось создать документ из-за ошибки
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.error_of') + (complete?translate('docs.msg._of_comp'):translate('docs.msg._of_save')) + translate('docs.msg._of_doc',{name:translate('docs.docs.moving')})}});
                break;
              }
              case -1:{//недостаточно прав
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.ne_perm')}});
                break;
              }
              case 0:{// недостаточно товара на складе
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_prod_movng')}});
                break;
              }
              case -50:{//Документ уже проведён
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.already_cmplt')}});
                break;
              }
              case -70:{//Отрицательное кол-во товара в истории движения товара
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.cnc_com_err1')}});
                break;
              }
              case -80:{//Отрицательное кол-во товара на складе
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.cnc_com_err2')}});
                break;
              }
              case -240:{//Есть услуги
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.there_services')}});
                break;
              }
              default:{// Успешно
                this.openSnackBar(translate('docs.msg.doc_name',{name:translate('docs.docs.moving')}) + (complete?translate('docs.msg.completed'):translate('docs.msg.saved')), translate('docs.msg.close'));
                if(complete) {
                  this.formBaseInformation.get('is_completed').setValue(true);//если сохранение с проведением - окончательно устанавливаем признак проведённости = true
                  if(this.movingProductsTableComponent){
                    this.movingProductsTableComponent.showColumns(); //чтобы спрятать столбцы после проведения 
                    // this.movingProductsTableComponent.tableRecount();
                    this.movingProductsTableComponent.getProductsTable();
                  }
                  if(this.settingsForm.get('statusOnFinishId').value&&this.statusIdInList(this.settingsForm.get('statusOnFinishId').value)){// если в настройках есть "Статус при проведении" - выставим его
                    this.formBaseInformation.get('status_id').setValue(this.settingsForm.get('statusOnFinishId').value);}
                  this.setStatusColor();//чтобы обновился цвет статуса
                }
              }
            }
          },
          error => {
            this.showQueryErrorMessage(error);
            },
      );
  } 
  clearFormSearchAndProductTable(){
    this.movingProductsTableComponent.resetFormSearch();
    this.movingProductsTableComponent.getControlTablefield().clear();
    this.getTotalSumPrice();//чтобы пересчиталась сумма в чеке
  }
  //забирает таблицу товаров из дочернего компонента и помещает ее в основную форму
  getProductsTable(){
    const control = <UntypedFormArray>this.formBaseInformation.get('movingProductTable');
    control.clear();
    this.movingProductsTableComponent.getProductTable().forEach(row=>{
      control.push(this.formingProductRowFromApiResponse(row));
    });
  }
  showQueryErrorMessage(error:any){
    console.log(error);
      let errMsg = (error.message) ? error.message : error.status ? `${error.status} - ${error.statusText}` : 'Server error';
      this.MessageDialog.open(MessageDialog,
      {
        width:'400px',
        data:{
          head:translate('docs.msg.error'),
          message:errMsg}
      })
  }

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 3000,
    });
  }

  //открывает диалог настроек
  openDialogSettings() { 
    const dialogSettings = this.SettingsMovingDialogComponent.open(SettingsMovingDialogComponent, {
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: '400px', 
      data:
      { //отправляем в диалог:
        priceTypesList:   this.receivedPriceTypesList, //список типов цен
        receivedCompaniesList: this.receivedCompaniesList, //список предприятий
        receivedDepartmentsList: this.receivedDepartmentsList, //список отделений
        company_id: this.formBaseInformation.get('company_id').value, // текущее предприятие (нужно для поиска поставщика)
        allowToCreateAllCompanies: this.allowToCreateAllCompanies,
        allowToCreateMyCompany: this.allowToCreateMyCompany,
        allowToCreateMyDepartments: this.allowToCreateMyDepartments,
        id: this.id, //чтобы понять, новый док или уже созданный
      },
    });
    dialogSettings.afterClosed().subscribe(result => {
      if(result){
        //если нажата кнопка Сохранить настройки - вставляем настройки в форму настроек и сохраняем
        if(result.get('companyId')) this.settingsForm.get('companyId').setValue(result.get('companyId').value);
        if(result.get('departmentFromId')) this.settingsForm.get('departmentFromId').setValue(result.get('departmentFromId').value);
        if(result.get('departmentToId')) this.settingsForm.get('departmentToId').setValue(result.get('departmentToId').value);
        if(result.get('pricingType')) this.settingsForm.get('pricingType').setValue(result.get('pricingType').value);
        if(result.get('priceTypeId')) this.settingsForm.get('priceTypeId').setValue(result.get('priceTypeId').value);
        if(result.get('plusMinus')) this.settingsForm.get('plusMinus').setValue(result.get('plusMinus').value);
        if(result.get('changePrice')) this.settingsForm.get('changePrice').setValue(result.get('changePrice').value);
        if(result.get('changePriceType')) this.settingsForm.get('changePriceType').setValue(result.get('changePriceType').value);
        this.settingsForm.get('hideTenths').setValue(result.get('hideTenths').value);
        if(result.get('autoAdd')) this.settingsForm.get('autoAdd').setValue(result.get('autoAdd').value);
        this.settingsForm.get('statusOnFinishId').setValue(result.get('statusOnFinishId').value);
        this.saveSettingsMoving();
        // если это новый документ, и ещё нет выбранных товаров - применяем настройки 
        if(+this.id==0 && this.movingProductsTableComponent.getProductTable().length==0)  {
          //если в настройках сменили предприятие - нужно сбросить статусы, чтобы статус от предыдущего предприятия не прописался в актуальное
          if(+this.settingsForm.get('companyId').value!= +this.formBaseInformation.get('company_id').value) 
            this.resetStatus();
          this.getData();
        }
      }
    });
  }

  productTableRecount(){
    //т.к. нет флажка "НДС включён" (т.к. он всегда включён в цену, если "НДС"=true), то в таблице товаров ничего пересчитывать не надо - НДС не накидывается к цене, если "НДС включён" !=true
  }

  saveSettingsMoving(){
    return this.http.post('/api/auth/saveSettingsMoving', this.settingsForm.value)
            .subscribe(
                (data) => {   
                          this.openSnackBar(translate('docs.msg.settngs_saved'), translate('docs.msg.close'));
                          
                        },
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
            );
  }

  getPriceTypesList(){
    this.receivedPriceTypesList=null;
    this.loadSpravService.getPriceTypesList(this.formBaseInformation.get('company_id').value)
    .subscribe(
      (data) => {
        this.receivedPriceTypesList=data as any [];
        this.necessaryActionsBeforeGetChilds();
      },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }

  //устанавливает цвет статуса (используется для цветовой индикации статусов)
  setStatusColor():void{
    this.receivedStatusesList.forEach(m=>
      {
        if(m.id==+this.formBaseInformation.get('status_id').value){
          this.formBaseInformation.get('status_color').setValue(m.color);
        }
      });
  }
  // setDefaultDate(){
  //   this.formBaseInformation.get('moving_date').setValue(moment());
  // }
  getCompanyNameById(id:number):string{
    let name:string;
    if(this.receivedCompaniesList){
      this.receivedCompaniesList.forEach(a=>{
        if(a.id==id) name=a.name;
      })
    }
    return(name);
  }
  getDepartmentNameById(id:number):string{
    let name:string;
    if(this.receivedDepartmentsList){
      this.receivedDepartmentsList.forEach(a=>{
        if(a.id==id) name=a.name;
      })
    }
    return(name);
  }
  onChangeProductsTableLengthHandler(){
    this.setCanEditCompAndDepth();
  }
  //товары должны добавляться только для одного предприятия и одного отделения. Если 1й товар уже добавлен, на начальной стадии (когда документ еще не создан, т.е. id = 0) нужно запретить изменять предприятие и отделение
  setCanEditCompAndDepth(){
    if(+this.movingProductsTableComponent.formSearch.get('product_id').value>0 ||  this.movingProductsTableComponent.getProductTable().length>0) this.canEditCompAndDepth=false; else this.canEditCompAndDepth=true;
  }

    //принимает от product-search-and-table.component сумму к оплате и никуда ее не передает :-( (атавизм от возврата покупателя, там она передавалась в модуль ККМ)
    totalSumPriceHandler($event: any) {
    }  

  //создание нового документа после проведения текущего
  goToNewDocument(){
    this._router.navigate(['ui/movingdoc']);
    this.id=0;

    this.clearFormSearchAndProductTable();//очистка формы поиска и таблицы с отобранными товарами
    this.formBaseInformation.get('id').setValue(null);
    this.formBaseInformation.get('uid').setValue('');
    this.formBaseInformation.get('is_completed').setValue(false);
    this.formBaseInformation.get('company_id').setValue(null);
    this.formBaseInformation.get('department_from_id').setValue(null);
    this.formBaseInformation.get('department_to_id').setValue(null);
    this.formBaseInformation.get('doc_number').setValue('');
    this.formBaseInformation.get('description').setValue('');
    this.formBaseInformation.get('overhead_netcost_method').setValue(0);
    this.formBaseInformation.get('overhead').setValue('');
    setTimeout(() => { this.movingProductsTableComponent.showColumns();}, 1000);
    this.setCanEditCompAndDepth();
    this.form.resetForm();
    this.resetStatus();
    // this.getLinkedDocsScheme(true);
    this.actionsBeforeGetChilds=0;
    this.startProcess=true;
    this.getData();
  }
  resetStatus(){
    this.formBaseInformation.get('status_id').setValue(null);
    this.formBaseInformation.get('status_name').setValue('');
    this.formBaseInformation.get('status_color').setValue('ff0000');
    this.formBaseInformation.get('status_description').setValue('');
    this.receivedStatusesList = [];
  }

//*****************************************************************************************************************************************/
/***********************************************************         ФАЙЛЫ          *******************************************************/
//*****************************************************************************************************************************************/
openDialogAddFiles() {
  const dialogRef = this.dialogAddFiles.open(FilesComponent, {
    maxWidth: '95vw',
    maxHeight: '95vh',
    height: '95%',
    width: '95%',
    data:
    { 
      mode: 'select',
      companyId: this.formBaseInformation.get('company_id').value
    },
  });
  dialogRef.afterClosed().subscribe(result => {
    console.log(`Dialog result: ${result}`);
    if(result)this.addFilesToMoving(result);
  });
}
openFileCard(docId:number) {
  const dialogRef = this.dialogAddFiles.open(FilesDocComponent, {
    maxWidth: '95vw',
    maxHeight: '95vh',
    height: '95%',
    width: '95%',
    data:
    { 
      mode: 'window',
      docId: docId
    },
  });
}
loadFilesInfo(){//                                     загружает информацию по прикрепленным файлам
  const body = {"id":this.id};
        return this.http.post('/api/auth/getListOfMovingFiles', body) 
          .subscribe(
              (data) => {  
                          this.filesInfo = data as any[]; 
                        },
              error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
          );
}
addFilesToMoving(filesIds: number[]){
  const body = {"id1":this.id, "setOfLongs1":filesIds};// передаем id товара и id файлов 
          return this.http.post('/api/auth/addFilesToMoving', body) 
            .subscribe(
                (data) => {  
                  this.loadFilesInfo();
                  this.openSnackBar(translate('docs.msg.files_added'), translate('docs.msg.close'));
                          },
                 error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
            );
}

clickBtnDeleteFile(id: number): void {
  const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
    width: '400px',
    data:
    { 
      head: translate('docs.msg.file_del_head'),
      query: translate('docs.msg.file_del_qury'),
      warning: translate('docs.msg.file_del_warn'),
    },
  });
  dialogRef.afterClosed().subscribe(result => {
    if(result==1){this.deleteFile(id);}
  });        
}

deleteFile(id:number){
  const body = {id: id, any_id:this.id}; 
  return this.http.post('/api/auth/deleteMovingFile',body)
  .subscribe(
      (data) => {   
                  this.loadFilesInfo();
                  this.openSnackBar(translate('docs.msg.deletet_succs'), translate('docs.msg.close'));
              },
      error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
  );  
}
//**********************************************************************************************************************************************/  
//*************************************************          СВЯЗАННЫЕ ДОКУМЕНТЫ          ******************************************************/
//**********************************************************************************************************************************************/  

//   //создание Списания или Оприходования
//   createLinkedDoc(docname:string){// принимает аргументы: Returnsup
//     let canCreateLinkedDoc:CanCreateLinkedDoc=this.canCreateLinkedDoc(docname); //проверим на возможность создания связанного документа
//     if(canCreateLinkedDoc.can){
//       this.formReturnsup.get('moving_id').setValue(this.id);
//       this.formReturnsup.get('cagent_id').setValue(this.formBaseInformation.get('cagent_id').value);
//       this.formReturnsup.get('nds').setValue(this.formBaseInformation.get('nds').value);
//       this.formReturnsup.get('company_id').setValue(this.formBaseInformation.get('company_id').value);
//       this.formReturnsup.get('department_id').setValue(this.formBaseInformation.get('department_id').value);
//       this.formReturnsup.get('description').setValue(translate('docs.msg.created_from')+translate('docs.docs.moving')+' '+translate('docs.top.number')+this.formBaseInformation.get('doc_number').value);
//       this.getProductsTableLinkedDoc(docname);//формируем таблицу товаров для создаваемого документа
//       this.http.post('/api/auth/insert'+docname, this.formReturnsup.value)
//       .subscribe(
//       (data) => {
//                   let createdDocId=data as number;
                
//                   switch(createdDocId){
//                     case null:{// null возвращает если не удалось создать документ из-за ошибки
//                       this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:"Ошибка создания документа "+(docname=="Returnsup"?"Возврат поставщику":"")}});
//                       break;
//                     }
//                     case -1:{//недостаточно прав
//                       this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:"Недостаточно прав для создания документа "+(docname=="Returnsup"?"Возврат поставщику":"")}});
//                       break;
//                     }
//                     default:{// Документ успешно создался в БД 
//                       this.openSnackBar("Документ "+(docname=='Returnsup'?'Возврат поставщику':'')+" успешно создан", "Закрыть");
//                       this.getLinkedDocsList(docname.toLowerCase());//обновляем список этого документа
//                     }
//                   }
//                 },
//         error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
//       );
//     } else this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:canCreateLinkedDoc.reason}});
//   }
  
// // забирает таблицу товаров из дочернего компонента и помещает ее в форму, предназначенную для создания Списания
//   getProductsTableLinkedDoc(docname:string){
//     let tableName:string;//для маппинга в соответствующие названия сетов в бэкэнде (например private Set<MovingProductForm> movingProductTable;)
//     tableName='returnsupProductTable';
//     const control = <FormArray>this.formReturnsup.get(tableName);
//     control.clear();
//     this.movingProductsTableComponent.getProductTable().forEach(row=>{
//           control.push(this.formingProductRowLinkedDoc(row,docname));
//     });
//   }
//   formingProductRowLinkedDoc(row: MovingProductTable, docname:string) {
//     return this._fb.group({
//       product_id: new FormControl (row.product_id,[]),
//       product_count: new FormControl (row.product_count,[]),
//       product_price:  new FormControl (row.product_price,[]),
//       product_sumprice: new FormControl (((row.product_count)*row.product_price).toFixed(2),[]),
//       nds_id:  new FormControl (row.nds_id,[]),
//     });
//   }
//   // можно ли создать связанный документ (да - если есть товары, подходящие для этого, и нет уже проведённого документа)
//   canCreateLinkedDoc(docname:string):CanCreateLinkedDoc{
//     if(!(this.movingProductsTableComponent && this.movingProductsTableComponent.getProductTable().length>0)){
 // return {can:false, reason:translate('docs.msg.cnt_crt_items',{name:translate('docs.docs.'+this.commonUtilites.getDocNameByDocAlias(docname))})};
  //     }else
//       return {can:true, reason:''};
//   }
//   getLinkedDocs(){
//     this.getLinkedDocsList('returnsup');//загрузка связанных возвратов
//   }
//   getLinkedDocsList(docName:string, fromDialog?:boolean){
//     this.http.get('/api/auth/getMovingLinkedDocsList?id='+this.id+'&docName='+docName)
//     .subscribe(
//         (data) => {   
//                       this.linkedDocsReturn=data as LinkedDocs [];
//                   },
//         error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
//     );
//   }
//   clickButtonDeleteLinkedDoc(docName:string,id:number): void {
//       const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
//         width: '400px',
//         data:
//         { 
//           head: 'Удаление',
//           warning: 'Удалить '+(docName=='Returnsup'?'возврат поставщику?':''),
//           query: '',
//         },
//       });
//       dialogRef.afterClosed().subscribe(result => {
//         if(result==1){
//           this.deleteLinkedDoc(docName,id);
//         }
//       });  
//   }
//   dialogOpenLinkedDoc(id:number) {
//     const dialogRef = this.dialogCreateProduct.open(ReturnsupDocComponent, {
//       maxWidth: '95vw',
//       maxHeight: '95vh',
//       height: '95%',
//       width: '95%',
//       data:
//       { 
//         mode: 'window',
//         id: id
//       },
//     });
//     dialogRef.afterClosed().subscribe(result => {
//       if(result) this.getLinkedDocsList('returnsup',true);//если вернулось true - значит, возможно, зайдя в Возврат поставщику, его закрыли. Обновим список возвратов.
//   })}
//   deleteLinkedDoc(docName:string,id:number){
//     const body = {"checked": id}; 
//         return this.http.post('/api/auth/delete'+docName, body) 
//         .subscribe(
//             (data) => {   
//                         let result=data as boolean;
//                         if(result){
//                           this.openSnackBar(translate('docs.msg.deletet_succs'), translate('docs.msg.close'));
//                           this.getLinkedDocsList(docName.toLowerCase());//загрузка связанных возвратов
//                         }else
//                           this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:'Недостаточно прав для удаления'}});
//                       },
//             error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
//         );
//   }
//*****************************************************************************************************************************************/
  //------------------------------------------ COMMON UTILITES -----------------------------------------
  //Конвертирует число в строку типа 0.00 например 6.40, 99.25
  numToPrice(price:number,charsAfterDot:number) {
    //конертим число в строку и отбрасываем лишние нули без округления
    const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + charsAfterDot + "})?", "g")
    const a = price.toString().match(reg)[0];
    //находим положение точки в строке
    const dot = a.indexOf(".");
    // если число целое - добавляется точка и нужное кол-во нулей
    if (dot === -1) { 
        return a + "." + "0".repeat(charsAfterDot);
    }
    //если не целое число
    const b = charsAfterDot - (a.length - dot) + 1;
    return b > 0 ? (a + "0".repeat(b)) : a;
  }
  getTotalProductCount() {//бежим по столбцу product_count и складываем (аккумулируем) в acc начиная с 0 значения этого столбца
    this.getProductsTable();
    return (this.formBaseInformation.value.movingProductTable.map(t => +t.product_count).reduce((acc, value) => acc + value, 0)).toFixed(3).replace(".000", "").replace(".00", "");
  }
  getTotalSumPrice() {//бежим по столбцу product_sumprice и складываем (аккумулируем) в acc начиная с 0 значения этого столбца
    this.getProductsTable();
    return (this.formBaseInformation.value.movingProductTable.map(t => +t.product_sumprice).reduce((acc, value) => acc + value, 0)).toFixed(2);
  }
  numberOnly(event): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;//т.к. IE использует event.keyCode, а остальные - event.which
    if (charCode > 31 && (charCode < 48 || charCode > 57)) { return false; } return true;}
  numberOnlyPlusDotAndComma(event): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;//т.к. IE использует event.keyCode, а остальные - event.which
    if (charCode > 31 && ((charCode < 48 || charCode > 57) && charCode!=44 && charCode!=46)) { return false; } return true;}
  numberOnlyPlusDot(event): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;//т.к. IE использует event.keyCode, а остальные - event.which
    if (charCode > 31 && ((charCode < 48 || charCode > 57) && charCode!=46)) { return false; } return true;}
  getFormIngexByProductId(productId:number):number{
    let retIndex:number;
    let formIndex:number=0;
    this.formBaseInformation.value.movingProductTable.map(i => 
      {
      if(+i['product_id']==productId){retIndex=formIndex}
      formIndex++;
    });return retIndex;}
    
  getBaseData(data) {    //+++ emit data to parent component
    this.baseData.emit(data);
  }
  // The situation can be, that in settings there is "Status after ompletion" for company A, but document created for company B. If it happens, when completion is over, Dokio can set this status of company A to the document, but that's wrong! 
  statusIdInList(id:number):boolean{let r=false;this.receivedStatusesList.forEach(c=>{if(id==+c.id) r=true});return r}
}

