import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import { ActivatedRoute} from '@angular/router';
import { LoadSpravService } from '../../../../services/loadsprav';
import { UntypedFormGroup, UntypedFormArray,  UntypedFormBuilder,  Validators, UntypedFormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialog } from 'src/app/ui/dialogs/confirmdialog-with-custom-text.component';
import { MatDialog } from '@angular/material/dialog';
import { ValidationService } from './validation.service';
import { SettingsInventoryDialogComponent } from 'src/app/modules/settings/settings-inventory-dialog/settings-inventory-dialog.component';
import { InventoryProductsTableComponent } from 'src/app/modules/trade-modules/inventory-products-table/inventory-products-table.component';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { Router } from '@angular/router';
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { FilesComponent } from '../files/files.component';
import { FilesDocComponent } from '../files-doc/files-doc.component';
import { v4 as uuidv4 } from 'uuid';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { graphviz }  from 'd3-graphviz';
import { translate } from '@ngneat/transloco'; //+++
import { CommonUtilitesService } from '../../../../services/common_utilites.serviсe'; //+++

interface InventoryProductTable { //интерфейс для товаров, (т.е. для формы, массив из которых будет содержать форма inventoryProductTable, входящая в formBaseInformation)
  id: number;
  row_id: number;
  product_id: number;
  inventory_id:number;
  name: string;
  estimated_balance: number;
  actual_balance: number;
  edizm: string;
  // edizm_id: number;
  product_price: number;
  department_id: number; // склад инвентаризации
  department: string; // название склада, с которого будет производиться инвентаризация.                                  
}
interface DocResponse {//интерфейс для получения ответа в методе getInventoryValuesById
  id: number;
  company: string;
  company_id: number;
  department: string;
  department_id: number;
  creator: string;
  creator_id: number;
  master: string;
  master_id: number;
  changer:string;
  changer_id: number;
  date_time_created: string;
  date_time_changed: string;
  status_id: number;
  status_name: string;
  status_color: string;
  status_description: string;
  doc_number: string;
  name: string;
  description : string;
  is_deleted: boolean;
  is_completed: boolean;
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
  selector: 'app-inventory-doc',
  templateUrl: './inventory-doc.component.html',
  styleUrls: ['./inventory-doc.component.css'],
  providers: [LoadSpravService,Cookie,CommonUtilitesService]
})
export class InventoryDocComponent implements OnInit {

  id: number = 0;// id документа
  createdDocId: number;//получение id созданного документа
  receivedCompaniesList: IdAndName [];//массив для получения списка предприятий
  receivedDepartmentsList: IdAndName [] = [];//массив для получения списка отделений
  receivedStatusesList: StatusInterface [] = []; // массив для получения статусов
  receivedMyDepartmentsList: IdAndName [] = [];//массив для получения списка отделений
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
  panelWriteoffOpenState=false;
  panelPostingOpenState=false;
  accountingCurrency='';// short name of Accounting currency of user's company (e.g. $ or EUR)

  //для загрузки связанных документов
  LinkedDocsWriteoff:LinkedDocs[]=[];
  LinkedDocsPosting:LinkedDocs[]=[];

  // Формы
  formAboutDocument:any;//форма, содержащая информацию о документе (создатель/владелец/изменён кем/когда)
  formBaseInformation: UntypedFormGroup; //массив форм для накопления информации о Заказе покупателя
  settingsForm: any; // форма с настройками
  formWP:any// Форма для отправки при создании Списания или Оприходования

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
  allowToCreate:boolean = false;
  allowToComplete:boolean = false;
  showOpenDocIcon:boolean=false;
  editability:boolean = false;//редактируемость. true если есть право на создание и документ создаётся, или есть право на редактирование и документ создан

  rightsDefined:boolean; // определены ли права !!!
  lastCheckedDocNumber:string=''; //!!!

  isDocNumberUnicalChecking = false;//идёт ли проверка на уникальность номера
  doc_number_isReadOnly=true;

  // для построения диаграмм связанности
  tabIndex=0;// индекс текущего отображаемого таба (вкладки)
  linkedDocsCount:number = 0; // кол-во документов в группе, ЗА ИСКЛЮЧЕНИЕМ текущего
  linkedDocsText:string = ''; // схема связанных документов (пример - в самом низу)
  loadingDocsScheme:boolean = false;
  linkedDocsSchemeDisplayed:boolean = false;
  showGraphDiv:boolean=true;

//   dotIndex = 0;
//   dots = [
//     [
//         'digraph  {',
//         '    node [style="filled"]',
//         '    a [fillcolor="#d62728"]',
//         '    b [fillcolor="#1f77b4"]',
//         '    a -> b',
//         '}'
//     ],
//     [
//         'digraph  {',
//         '    node [style="filled"]',
//         '    a [fillcolor="#d62728"]',
//         '    c [fillcolor="#2ca02c"]',
//         '    b [fillcolor="#1f77b4"]',
//         '    a -> b',
//         '    a -> c',
//         '}'
//     ]
// ];


  @ViewChild("doc_number", {static: false}) doc_number; //для редактирования номера документа
  @ViewChild(InventoryProductsTableComponent, {static: false}) public inventoryProductsTableComponent:InventoryProductsTableComponent;
  @Output() baseData: EventEmitter<any> = new EventEmitter(); //+++ for get base datа from parent component (like myId, myCompanyId etc)

  constructor(private activateRoute: ActivatedRoute,
    private cdRef:ChangeDetectorRef,
    private _fb: UntypedFormBuilder, //чтобы билдить группу форм inventoryProductTable
    private http: HttpClient,
    public ConfirmDialog: MatDialog,
    public dialogAddFiles: MatDialog,
    public SettingsInventoryDialogComponent: MatDialog,
    public dialogCreateProduct: MatDialog,
    public MessageDialog: MatDialog,
    private loadSpravService:   LoadSpravService,
    private _snackBar: MatSnackBar,
    private _router:Router,
    public cu: CommonUtilitesService) 
    { 
      if(activateRoute.snapshot.params['id'])
        this.id = +activateRoute.snapshot.params['id'];
    }

  ngOnInit(): void {


    this.formBaseInformation = new UntypedFormGroup({
      id: new UntypedFormControl                 (this.id,[]),
      company_id: new UntypedFormControl         (null,[Validators.required]),
      department_id: new UntypedFormControl      (null,[Validators.required]),
      doc_number: new UntypedFormControl         ('',[Validators.maxLength(10),Validators.pattern('^[0-9]{1,10}$')]),
      description: new UntypedFormControl        ('',[]),
      department: new UntypedFormControl         ('',[]),
      name: new UntypedFormControl               ('',[]),
      status_id: new UntypedFormControl          ('',[]),
      status_name: new UntypedFormControl        ('',[]),
      status_color: new UntypedFormControl       ('',[]),
      status_description: new UntypedFormControl ('',[]),
      is_completed: new UntypedFormControl       (false,[]),
      uid: new UntypedFormControl                (uuidv4(),[]),
      inventoryProductTable: new UntypedFormArray([]),
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
    
    // Форма для отправки при создании Списания или Оприходования
      this.formWP = new UntypedFormGroup({
        linked_doc_id: new UntypedFormControl      (null,[]),//id связанного документа (в данном случае Инвентаризации)
        parent_uid: new UntypedFormControl         (null,[]),// uid родительского документа
        child_uid: new UntypedFormControl          (null,[]),// uid дочернего документа
        linked_doc_name: new UntypedFormControl    (null,[]),//имя (таблицы) связанного документа
        uid: new UntypedFormControl                ('',[]),
        posting_date: new UntypedFormControl       ('',[]),
        writeoff_date: new UntypedFormControl      ('',[]),
        company_id: new UntypedFormControl         (null,[Validators.required]),
        department_id: new UntypedFormControl      (null,[Validators.required]),
        description: new UntypedFormControl        ('',[]),
        writeoffProductTable: new UntypedFormArray ([]),
        postingProductTable: new UntypedFormArray  ([]),

      });
    // Форма настроек
    this.settingsForm = new UntypedFormGroup({
      companyId: new UntypedFormControl                (null,[Validators.required]), // предприятие, для которого создаются настройки
      departmentId: new UntypedFormControl             (null,[]),                    // id отделения
      name:  new UntypedFormControl                    ('',[]),                      // наименование инвертаризации по умолчанию
      pricingType: new UntypedFormControl              ('avgCostPrice',[]),          // по умолчанию ставим "Средняя закупочная цена"// тип расценки. priceType - по типу цены, avgCostPrice - средн. себестоимость, lastPurchasePrice - Последняя закупочная цена, avgPurchasePrice - Средняя закупочная цена, manual - вручную
      priceTypeId: new UntypedFormControl              (null,[Validators.required]), // тип цены
      changePrice: new UntypedFormControl              (0,[Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,2})?\r?$')]), // наценка или скидка. В чем выражается (валюта или проценты) - определяет changePriceType, по умолчанию "плюс 10%"
      plusMinus: new UntypedFormControl                ('plus',[]),                  // Наценка (plus) или скидка (minus)
      changePriceType: new UntypedFormControl          ('procents',[]),              // выражение наценки (валюта или проценты): currency - валюта, procents - проценты
      hideTenths: new UntypedFormControl               (true,[]),                    // убрать десятые (копейки)
      statusOnFinishId: new UntypedFormControl         ('',[]),                      // статус после проведения инвентаризации
      defaultActualBalance: new UntypedFormControl     ('',[]),                      //  фактический баланс по умолчанию. "estimated" - как расчётный, "other" - другой (выбирается в other_actual_balance)
      otherActualBalance: new UntypedFormControl       (0,[Validators.pattern('^[0-9]{1,6}(?:[.,][0-9]{0,3})?\r?$')]),// "другой" фактический баланс по умолчанию. Например, 1
      autoAdd: new UntypedFormControl                  (false,[]),                   // автодобавление товара из формы поиска в таблицу
    });
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
    if(this.inventoryProductsTableComponent!=undefined) 
      return this.inventoryProductsTableComponent.getControlTablefield().valid;
    else return true;    
  }
  //---------------------------------------------------------------------------------------------------------------------------------------                            
  // ----------------------------------------------------- *** ПРАВА *** ------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------------------

  getSetOfPermissions(){
    return this.http.get('/api/auth/getMyPermissions?id=27')
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
    let documentOfMyDepartments:boolean = (this.inMyDepthsId(+this.formBaseInformation.get('department_id').value));
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

  //нужно загруить всю необходимую информацию, прежде чем вызывать детей (Поиск и добавление товара, Кассовый модуль), иначе их ngOnInit выполнится быстрее, чем загрузится вся информация в родителе
  //вызовы из:
  //getPriceTypesList()*
  //refreshPermissions()
  necessaryActionsBeforeGetChilds(){
    this.actionsBeforeGetChilds++;
    //Если набрано необходимое кол-во действий для отображения модуля Формы поиска и добавления товара, и кассововго модуля
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
    this.allowToCreateAllCompanies = this.permissionsSet.some(         function(e){return(e==329)});
    this.allowToCreateMyCompany = this.permissionsSet.some(            function(e){return(e==330)});
    this.allowToCreateMyDepartments = this.permissionsSet.some(        function(e){return(e==331)});
    this.allowToViewAllCompanies = this.permissionsSet.some(           function(e){return(e==336)});
    this.allowToViewMyCompany = this.permissionsSet.some(              function(e){return(e==337)});
    this.allowToViewMyDepartments = this.permissionsSet.some(          function(e){return(e==338)});
    this.allowToViewMyDocs = this.permissionsSet.some(                 function(e){return(e==339)});
    this.allowToUpdateAllCompanies = this.permissionsSet.some(         function(e){return(e==340)});
    this.allowToUpdateMyCompany = this.permissionsSet.some(            function(e){return(e==341)});
    this.allowToUpdateMyDepartments = this.permissionsSet.some(        function(e){return(e==342)});
    this.allowToUpdateMyDocs = this.permissionsSet.some(               function(e){return(e==343)});
    this.allowToCompleteAllCompanies = this.permissionsSet.some(       function(e){return(e==631)});
    this.allowToCompleteMyCompany = this.permissionsSet.some(          function(e){return(e==632)});
    this.allowToCompleteMyDepartments = this.permissionsSet.some(      function(e){return(e==633)});
    this.allowToCompleteMyDocs = this.permissionsSet.some(             function(e){return(e==634)});
   
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
    // console.log("allowToCreateAllCompanies - "+this.allowToCreateAllCompanies);
    // console.log("allowToCreateMyCompany - "+this.allowToCreateMyCompany);
    // console.log("allowToCreateMyDepartments - "+this.allowToCreateMyDepartments);
    this.getData();
  }

  getData(){
    if(+this.id>0){
      this.getDocumentValuesById();
    }else {
      this.getCompaniesList(); 
    }
  }

  onCompanyChange(){
    this.formBaseInformation.get('department_id').setValue(null);
    this.formBaseInformation.get('status_id').setValue(null);
    this.actionsBeforeGetChilds=0;
    this.getDepartmentsList();
    this.getPriceTypesList();
    this.getStatusesList();
  }

  onDepartmentChange(){
      this.formBaseInformation.get('department').setValue(this.getDepartmentNameById(this.formBaseInformation.get('department_id').value));
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
    if(+this.formBaseInformation.get('department_id').value==0 && this.receivedDepartmentsList.length>0){
      this.formBaseInformation.get('department_id').setValue(this.receivedDepartmentsList[0].id);
      //Если дочерние компоненты уже загружены - устанавливаем предприятие по дефолту как склад в форме поиска и добавления товара
      // if(!this.startProcess){
      //   this.inventoryProductsTableComponent.formSearch.get('secondaryDepartmentId').setValue(this.formBaseInformation.get('department_id').value);  
      //   this.inventoryProductsTableComponent.setCurrentTypePrice();//если сменили отделение - нужно проверить, есть ли у него тип цены. И если нет - в вызываемом методе выведется предупреждение для пользователя
      // }
    }
    //если отделение было выбрано (через настройки или же в этом методе) - определяем его наименование (оно будет отправляться в дочерние компоненты)
    if(+this.formBaseInformation.get('department_id').value>0)
      this.formBaseInformation.get('department').setValue(this.getDepartmentNameById(this.formBaseInformation.get('department_id').value));

    //если идет стартовая прогрузка - продолжаем цепочку запросов. Если это была, например, просто смена предприятия - продолжать далее текущего метода смысла нет
    if(this.startProcess) {
      this.getStatusesList();
      this.checkAnyCases();
    }
  }
   // проверки на различные случаи
  checkAnyCases(){
    //проверка на то, что отделение все еще числится в отделениях предприятия (не было удалено и т.д.)
    if(!this.inDepthsId(+this.formBaseInformation.get('department_id').value)){
      this.formBaseInformation.get('department_id').setValue(null);
    }
    //проверка на то, что отделение подходит под ограничения прав (если можно создавать только по своим отделениям, но выбрано отделение, не являющееся своим - устанавливаем null в выбранное id отделения)
    if(!this.allowToCreateAllCompanies && !this.allowToCreateMyCompany && this.allowToCreateMyDepartments){
      if(!this.inMyDepthsId(+this.formBaseInformation.get('department_id').value)){
        this.formBaseInformation.get('department_id').setValue(null);
      }
    }
    if(this.startProcess) this.refreshPermissions();
  }
  getStatusesList(){
    this.receivedStatusesList=null;
    this.loadSpravService.getStatusList(this.formBaseInformation.get('company_id').value,27) //27 - id документа из таблицы documents
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
    if(+this.id==0)//!!!!! отсюда загружаем настройки только если документ новый. Если уже создан - настройки грузятся из getDocumentValuesById
      this.getSettings();
  }
  doFilterDepartmentsList(){
    if(!this.allowToCreateAllCompanies && !this.allowToCreateMyCompany && this.allowToCreateMyDepartments){
      this.receivedDepartmentsList=this.receivedMyDepartmentsList;}
    // this.secondaryDepartments=this.receivedDepartmentsList;
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
      // console.log("depth.id - "+depth.id+", id - "+id)
      depth.id==id?inDepthsId=true:null;
      // console.log("inDepthsId - "+inDepthsId);
    });
    // console.log("returning inDepthsId - "+inDepthsId);
  return inDepthsId;
  }

  //загрузка настроек
  getSettings(){
    let result:any;
    this.http.get('/api/auth/getSettingsInventory')
      .subscribe(
          data => { 
            result=data as any;
            //вставляем настройки в форму настроек
            this.settingsForm.get('companyId').setValue(result.companyId);
            //данная группа настроек зависит от предприятия
            this.settingsForm.get('departmentId').setValue(result.departmentId);
            this.settingsForm.get('statusOnFinishId').setValue(result.statusOnFinishId);
            this.settingsForm.get('priceTypeId').setValue(result.priceTypeId);
            //данная группа настроек не зависит от предприятия
            this.settingsForm.get('pricingType').setValue(result.pricingType);
            this.settingsForm.get('plusMinus').setValue(result.plusMinus);
            this.settingsForm.get('changePrice').setValue(result.changePrice);
            this.settingsForm.get('changePriceType').setValue(result.changePriceType);
            this.settingsForm.get('hideTenths').setValue(result.hideTenths);
            this.settingsForm.get('name').setValue(result.name);
            this.settingsForm.get('defaultActualBalance').setValue(result.defaultActualBalance);
            this.settingsForm.get('otherActualBalance').setValue(result.otherActualBalance);
            this.settingsForm.get('autoAdd').setValue(result.autoAdd);
           //если предприятия из настроек больше нет в списке предприятий (например, для пользователя урезали права, и выбранное предприятие более недоступно)
            //необходимо не загружать эти настройки
            if(this.isCompanyInList(+result.companyId)){
              this.settingsForm.get('companyId').setValue(result.companyId);
              //данная группа настроек зависит от предприятия
              this.settingsForm.get('departmentId').setValue(result.departmentId);
              this.settingsForm.get('statusOnFinishId').setValue(result.statusOnFinishId);
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
      this.formBaseInformation.get('department_id').setValue(this.settingsForm.get('departmentId').value);
      this.formBaseInformation.get('name').setValue(this.settingsForm.get('name').value);
    }
  }

  getDocumentValuesById(){
    this.http.get('/api/auth/getInventoryValuesById?id='+ this.id)
        .subscribe(
            data => { 
                let documentValues: DocResponse=data as any;// <- засовываем данные в интерфейс для принятия данных
                //!!!
                if(data!=null&&documentValues.company_id!=null){
                  this.formAboutDocument.get('id').setValue(+documentValues.id);
                  this.formAboutDocument.get('master').setValue(documentValues.master);
                  this.formAboutDocument.get('creator').setValue(documentValues.creator);
                  this.formAboutDocument.get('changer').setValue(documentValues.changer);
                  this.formAboutDocument.get('company').setValue(documentValues.company);
                  this.formAboutDocument.get('date_time_created').setValue(documentValues.date_time_created);
                  this.formAboutDocument.get('date_time_changed').setValue(documentValues.date_time_changed);
                  this.formBaseInformation.get('id').setValue(+documentValues.id);
                  this.formBaseInformation.get('company_id').setValue(documentValues.company_id);
                  this.formBaseInformation.get('department_id').setValue(documentValues.department_id);
                  this.formBaseInformation.get('department').setValue(documentValues.department);
                  this.formBaseInformation.get('doc_number').setValue(documentValues.doc_number);
                  this.formBaseInformation.get('description').setValue(documentValues.description);
                  this.formBaseInformation.get('name').setValue(documentValues.name);
                  this.formBaseInformation.get('status_id').setValue(documentValues.status_id);
                  this.formBaseInformation.get('status_name').setValue(documentValues.status_name);
                  this.formBaseInformation.get('status_color').setValue(documentValues.status_color);
                  this.formBaseInformation.get('status_description').setValue(documentValues.status_description);
                  this.formBaseInformation.get('is_completed').setValue(documentValues.is_completed);
                  this.formBaseInformation.get('uid').setValue(documentValues.uid);
                  this.creatorId=+documentValues.creator_id;
                  // this.getSpravSysEdizm();//справочник единиц измерения
                  this.getCompaniesList(); // загрузка списка предприятий (здесь это нужно для передачи его в настройки)
                  this.getPriceTypesList();
                  this.loadFilesInfo();
                  this.getSettings();
                  this.getDepartmentsList();//отделения
                  this.getStatusesList();//статусы документа Инвентаризация
                  this.getLinkedDocsScheme(true); //загрузка связанных документов
                  
                } else {this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}})} //+++
                this.refreshPermissions();
            },
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})} //+++
        );
  }

  formingProductRowFromApiResponse(row: InventoryProductTable) {
    return this._fb.group({
      id: new UntypedFormControl (row.id,[]),
      product_id: new UntypedFormControl (row.product_id,[]),
      inventory_id: new UntypedFormControl (+this.id,[]),
      name: new UntypedFormControl (row.name,[]),
      estimated_balance: new UntypedFormControl (row.estimated_balance,[Validators.required, Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,3})?\r?$')]),
      actual_balance: new UntypedFormControl (row.actual_balance,[Validators.required, Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,3})?\r?$')]),
      // product_price:  new UntypedFormControl (this.numToPrice(row.product_price,2),[Validators.required,Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,2})?\r?$'),ValidationService.priceMoreThanZero]),
      product_price:  new UntypedFormControl (this.numToPrice(row.product_price,2),[Validators.required,Validators.pattern('^[0-9]{1,7}(?:[.,][0-9]{0,2})?\r?$')]),

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


  //создание нового документа Инвентаризация
  createNewDocument(){
    this.createdDocId=null;
    this.getProductsTable();
    this.formBaseInformation.get('uid').setValue(uuidv4());
    this.http.post('/api/auth/insertInventory', this.formBaseInformation.value)
      .subscribe(
      (data) => {
                  this.actionsBeforeGetChilds=0;
                  this.createdDocId=data as number;
                  switch(this.createdDocId){
                    case null:{// null возвращает если не удалось создать документ из-за ошибки
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.crte_doc_err',{name:translate('docs.docs.inventory')})}});
                      // console.log("3-"+!this.formBaseInformation.valid);
                      break;
                    }
                    case -1:{//недостаточно прав
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm_creat',{name:translate('docs.docs.inventory')})}});
                      break;
                    }
                    case -240:{//Есть услуги
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.there_services')}});
                      break;
                    }
                    default:{// Инвентаризация успешно создалась в БД 
                      this.openSnackBar(translate('docs.msg.doc_crtd_suc'),translate('docs.msg.close'));
                      this.afterCreateInventory();
                    }
                  }
                },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
      );
  }

  //действия после создания нового документа Инвентаризиция
  afterCreateInventory(){
      this.id=+this.createdDocId;
      this._router.navigate(['/ui/inventorydoc', this.id]);
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
    this.http.post('/api/auth/setInventoryAsDecompleted',  this.formBaseInformation.value)
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
              case -60:{//Документ уже снят с проведения
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.alr_cnc_com')}});
                break;
              }
              case 1:{// Успешно
                this.openSnackBar(translate('docs.msg.cnc_com_succs',{name:translate('docs.docs.inventory')}), translate('docs.msg.close'));
                // this.getLinkedDocsScheme(true);//загрузка диаграммы связанных документов
                this.formBaseInformation.get('is_completed').setValue(false);
                if(this.inventoryProductsTableComponent){
                  this.inventoryProductsTableComponent.getProductsTable();
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
    if(complete) {
      if(this.inventoryProductsTableComponent.getProductTable().length==0){
        // this.oneClickSaveControl=false;
        this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.no_prods')}});      
        return;
      }
      if(this.settingsForm.get('statusOnFinishId').value&&this.statusIdInList(this.settingsForm.get('statusOnFinishId').value))// если в настройках есть "Статус при проведении" - выставим его
        this.formBaseInformation.get('status_id').setValue(this.settingsForm.get('statusOnFinishId').value);
      this.formBaseInformation.get('is_completed').setValue(true);//если сохранение с проведением
    }
    this.http.post('/api/auth/updateInventory',  this.formBaseInformation.value)
      .subscribe(
          (data) => 
          {   
            if(complete){
              this.formBaseInformation.get('is_completed').setValue(false);//если сохранение с проведением - удаляем временную установку признака проведенности, 
              this.formBaseInformation.get('status_id').setValue(currentStatus);//и возвращаем предыдущий статус
            }
            let result:number=data as number;
            switch(result){
              case null:{// null возвращает если не удалось создать документ из-за ошибки
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.error_of') + (complete?translate('docs.msg._of_comp'):translate('docs.msg._of_save')) + translate('docs.msg._of_doc',{name:translate('docs.docs.invoicein')})}});
                break;
              }
              case -1:{//недостаточно прав
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}});
                break;
              }
              case -50:{//Документ уже проведён
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.already_cmplt')}});
                break;
              }
              case -240:{//Есть услуги
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.there_services')}});
                break;
              }
              default:{// Успешно
                this.openSnackBar(translate('docs.msg.doc_name',{name:translate('docs.docs.inventory')}) + (complete?translate('docs.msg.completed'):translate('docs.msg.saved')), translate('docs.msg.close'));
                this.getLinkedDocsScheme(true);//обновляем схему связанных документов
                if(complete) {
                  this.formBaseInformation.get('is_completed').setValue(true);//если сохранение с проведением - окончательно устанавливаем признак проведённости = true
                  if(this.inventoryProductsTableComponent){
                    this.inventoryProductsTableComponent.showColumns(); //чтобы спрятать столбцы после проведения 
                    this.inventoryProductsTableComponent.getProductsTable();
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
    this.inventoryProductsTableComponent.resetFormSearch();
    this.inventoryProductsTableComponent.getControlTablefield().clear();
    this.getTotalSumPrice();//чтобы пересчиталась сумма в чеке
  }
  //забирает таблицу товаров из дочернего компонента и помещает ее в основную форму
  getProductsTable(){
    const control = <UntypedFormArray>this.formBaseInformation.get('inventoryProductTable');
    control.clear();
    this.inventoryProductsTableComponent.getProductTable().forEach(row=>{
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
    const dialogSettings = this.SettingsInventoryDialogComponent.open(SettingsInventoryDialogComponent, {
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: '400px', 
      data:
      { //отправляем в диалог:
        priceTypesList:   this.receivedPriceTypesList, //список типов цен
        receivedCompaniesList: this.receivedCompaniesList, //список предприятий
        receivedDepartmentsList: this.receivedDepartmentsList, //список отделений
        company_id: this.formBaseInformation.get('company_id').value, // текущее предприятие (нужно для поиска покупателя)
        allowToCreateAllCompanies: this.allowToCreateAllCompanies,
        allowToCreateMyCompany: this.allowToCreateMyCompany,
        allowToCreateMyDepartments: this.allowToCreateMyDepartments,
        id: this.id, //чтобы понять, новый док или уже созданный
      },
    });
    dialogSettings.afterClosed().subscribe(result => {
      if(result){
        //если нажата кнопка Сохранить настройки - вставляем настройки в форму настроек и сохраняем
        this.settingsForm.get('companyId').setValue(result.get('companyId').value);
        this.settingsForm.get('departmentId').setValue(result.get('departmentId').value);
        this.settingsForm.get('pricingType').setValue(result.get('pricingType').value);
        this.settingsForm.get('priceTypeId').setValue(result.get('priceTypeId').value);
        this.settingsForm.get('plusMinus').setValue(result.get('plusMinus').value);
        this.settingsForm.get('changePrice').setValue(result.get('changePrice').value);
        this.settingsForm.get('changePriceType').setValue(result.get('changePriceType').value);
        this.settingsForm.get('name').setValue(result.get('name').value);
        this.settingsForm.get('defaultActualBalance').setValue(result.get('defaultActualBalance').value);
        this.settingsForm.get('otherActualBalance').setValue(result.get('otherActualBalance').value);
        this.settingsForm.get('autoAdd').setValue(result.get('autoAdd').value);
        this.settingsForm.get('hideTenths').setValue(result.get('hideTenths').value);
        this.settingsForm.get('statusOnFinishId').setValue(result.get('statusOnFinishId').value);
        this.saveSettingsInventory();
        
        // если это новый документ, и ещё нет выбранных товаров - применяем настройки 
        if(+this.id==0 && this.inventoryProductsTableComponent.getProductTable().length==0)  {
          //если в настройках сменили предприятие - нужно сбросить статусы, чтобы статус от предыдущего предприятия не прописался в актуальное
          if(+this.settingsForm.get('companyId').value!= +this.formBaseInformation.get('company_id').value) 
            this.resetStatus();
          this.getData();
        }
      }
    });
  }

  saveSettingsInventory(){
    return this.http.post('/api/auth/saveSettingsInventory', this.settingsForm.value)
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
    if(this.inventoryProductsTableComponent.getProductTable().length>0) this.canEditCompAndDepth=false; else this.canEditCompAndDepth=true;
  }

//**********************************************************************************************************************************************/  
//*************************************************          СВЯЗАННЫЕ ДОКУМЕНТЫ          ******************************************************/
//**********************************************************************************************************************************************/ 
  //создание Списания или Оприходования
  createLinkedDoc(docname:string){// принимает аргументы: Writeoff или Posting
    let canCreateLinkedDoc:CanCreateLinkedDoc=this.canCreateLinkedDoc(docname); //проверим на возможность создания связанного документа
    if(canCreateLinkedDoc.can){
      let uid = uuidv4();
      this.formWP.get('linked_doc_id').setValue(this.id);//id связанного документа (того, из которого инициируется создание данного документа)
      this.formWP.get('parent_uid').setValue(this.formBaseInformation.get('uid').value);// uid исходящего (родительского) документа
      this.formWP.get('child_uid').setValue(uid);// uid дочернего документа. Дочерний - не всегда тот, которого создают из текущего документа. Например, при создании из Отгрузки Счёта покупателю - Отгрузка будет дочерней для него.
      this.formWP.get('linked_doc_name').setValue('inventory');//имя (таблицы) связанного документа
      this.formWP.get('uid').setValue(uid);// uid дочернего документа
      this.formWP.get('company_id').setValue(this.formBaseInformation.get('company_id').value);
      this.formWP.get('department_id').setValue(this.formBaseInformation.get('department_id').value);
      this.formWP.get('description').setValue(translate('docs.msg.created_from')+translate('docs.docs.inventory')+' '+translate('docs.top.number')+ this.formBaseInformation.get('doc_number').value);
      this.getProductsTableWP(docname);//формируем таблицу товаров для создаваемого документа
      this.http.post('/api/auth/insert'+docname, this.formWP.value)
      .subscribe(
      (data) => {
                  let createdDocId=data as number;
                  switch(createdDocId){
                    case null:{// null возвращает если не удалось создать документ из-за ошибки
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.crte_doc_err',{name:translate('docs.docs.'+this.cu.getDocNameByDocAlias(docname))})}});
                      break;
                    }
                    case -1:{//недостаточно прав
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.ne_perm_creat',{name:translate('docs.docs.'+this.cu.getDocNameByDocAlias(docname))})}});
                      break;
                    }
                    default:{// Документ успешно создался в БД 
                      this.openSnackBar(translate('docs.msg.doc_crtd_succ',{name:translate('docs.docs.'+this.cu.getDocNameByDocAlias(docname))}), translate('docs.msg.close'));
                      // this.getLinkedDocsScheme(true);//обновляем схему этого документа
                      this._router.navigate(['/ui/'+docname.toLowerCase()+'doc', createdDocId]);
                    }
                  }
                },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
      );
    } else this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:canCreateLinkedDoc.reason}});
  }
//забирает таблицу товаров из дочернего компонента и помещает ее в форму, предназначенную для создания Оприходования или Списания
  getProductsTableWP(docname:string){
    let tableName:string;//для маппинга в соответствующие названия сетов в бэкэнде (например private Set<PostingProductForm> postingProductTable;)
    if(docname=='Writeoff') tableName='writeoffProductTable'; else tableName='postingProductTable';
    const control = <UntypedFormArray>this.formWP.get(tableName);
    control.clear();
    this.inventoryProductsTableComponent.getProductTable().forEach(row=>{
      if(docname=='Writeoff'){// Если Списание - отбираем из всего списка только товары с недостачей
        if((row.actual_balance-row.estimated_balance)<0)
          control.push(this.formingProductRowWP(row,docname));
      } else { // 'Posting'       Если Оприходование - отбираем из всего списка только товары с избытком 
        if((row.actual_balance-row.estimated_balance)>0)
          control.push(this.formingProductRowWP(row,docname));
      }
    });
  }

  //можно ли создать связанный документ (да - если есть товары, подходящие для этого, и нет уже проведённого документа)
  canCreateLinkedDoc(docname:string):CanCreateLinkedDoc{
    let isThereCompletedLinkedDocs:boolean = this.isThereCompletedLinkedDocs(docname);
    let noProductsToCreateLinkedDoc:boolean = this.getProductsCountToLinkedDoc(docname)==0;
    if(isThereCompletedLinkedDocs || noProductsToCreateLinkedDoc){
      if(isThereCompletedLinkedDocs)
        return {can:false, reason:translate('docs.msg.cnt_crt_')+(docname=='Writeoff'?translate('docs.docs.writeoff'):translate('docs.docs.posting'))+translate('docs.msg._cause_comp_d')+(docname=='Writeoff'?translate('docs.docs.writeoff'):translate('docs.docs.posting'))+'"'};
      else
        return {can:false, reason:translate('docs.msg.cnt_crt_')+(docname=='Writeoff'?translate('docs.docs.writeoff'):translate('docs.docs.posting'))+translate('docs.msg._cause_no_pos')+(docname=='Writeoff'?translate('docs.msg._minus'):translate('docs.msg._plus'))+translate('docs.msg._diff')};
    }else
      return {can:true, reason:''};
  }

  //есть ли уже проведённый связанный документ (для возможности создания их при их отсутствии) Например, не получится создать Списание, если уже есть проведённые Списания
  isThereCompletedLinkedDocs(docname:string):boolean{
    let isThere:boolean=false;
    if(docname=='Writeoff'){// Если Списание
      this.LinkedDocsWriteoff.map(i=>{
        if(i.is_completed)
          isThere=true;
      });
    } else {// 'Posting'       Если Оприходование
      this.LinkedDocsPosting.map(i=>{
        if(i.is_completed)
          isThere=true;
      });
    }
    return isThere;
  }
  //возвращает количество товаров, подходящих для связанных документов (для возможности создания их при количестве >0) Например, не получится создать Списание, если кол-во товаров с недостачей = 0, т.е списывать нечего
  getProductsCountToLinkedDoc(docname:string):number{
    let count:number=0;
    this.inventoryProductsTableComponent.getProductTable().forEach(row=>{
      if(docname=='Writeoff'){// Если Списание - отбираем из всего списка только товары с недостачей
        if((row.actual_balance-row.estimated_balance)<0)
          count++
      } else { // 'Posting'       Если Оприходование - отбираем из всего списка только товары с избытком 
        if((row.actual_balance-row.estimated_balance)>0)
          count++
      }
    });
    return count;
  }
  formingProductRowWP(row: InventoryProductTable, docname:string) {
    let product_count:number;
    if(docname=='Writeoff') product_count=row.estimated_balance-row.actual_balance; else product_count=row.actual_balance-row.estimated_balance;// чтобы в insertWriteoff ушло положительное число
    return this._fb.group({
      product_id: new UntypedFormControl (row.product_id,[]),
      product_count: new UntypedFormControl (product_count,[]),
      product_price:  new UntypedFormControl (row.product_price,[]),
      product_sumprice: new UntypedFormControl (((product_count)*row.product_price).toFixed(2),[]),
      reason_id: new UntypedFormControl (3,[]), // 3 - Недостачи и потери от порчи ценностей
    });
  }

  //если после закрытия диалога связанного документа в документе больше нечего делать (всё что можно было - было создано и закрыто) - предложим пользователю провести Инвентаризацию
  // offerToComplete(){
  //   let thereCompletedWriteoff=this.isThereCompletedLinkedDocs('Writeoff');
  //   let thereCompletedPosting=this.isThereCompletedLinkedDocs('Posting');
  //   let productsCountToWriteoff=this.getProductsCountToLinkedDoc('Writeoff');
  //   let productsCountToPosting=this.getProductsCountToLinkedDoc('Posting');
  //   if(!this.formBaseInformation.get('is_completed').value && // если инвентаризация еще не проведена и...
  //       (
  //         (thereCompletedWriteoff && thereCompletedPosting) || //если есть проведённые Списание и Оприходование или...
  //         (thereCompletedWriteoff && productsCountToPosting==0) || // есть проведённое Списание, и оприходовать нечего или...
  //         (thereCompletedPosting && productsCountToWriteoff==0) // есть проведённое Оприходование, и списывать нечего
  //       )
  //     )
  //   {// то предложим провести данную Инвентаризацию
  //     let warning:string;
  //     if(thereCompletedWriteoff && thereCompletedPosting) warning='Списание и Оприходование по данной Инвентаризации проведены. ';
  //     if(thereCompletedWriteoff && productsCountToPosting==0) warning='Списание по данной Инвентаризации проведено. Товарных позиций для Оприходования нет. ';
  //     if(thereCompletedPosting && productsCountToWriteoff==0) warning='Оприходование по данной Инвентаризации проведено. Товарных позиций для Списания нет. ';
  //     warning=warning+'Инвентаризацию можно провести.';
  //     const dialogRef = this.ConfirmDialog.open(ConfirmDialog, {
  //       width: '400px',
  //       data:
  //       { 
  //         head: 'Внимание',
  //         query: warning,
  //         warning: 'Провести эту Инвентаризацию?',
  //       },
  //     });
  //     dialogRef.afterClosed().subscribe(result => {
  //       if(result==1){
  //         this.completeDocument(true);//проводим Инвентаризацию без дополнительного диалога, т.к. пользователь уже дал согласие
  //       }
  //     });  
  //   }
  // }
  
  //создание нового документа
  goToNewDocument(){
    this._router.navigate(['ui/inventorydoc']);
    this.id=0;
    this.clearFormSearchAndProductTable();//очистка формы поиска и таблицы с отобранными товарами
    this.formBaseInformation.get('uid').setValue('');
    this.formBaseInformation.get('is_completed').setValue(false);
    this.formBaseInformation.get('company_id').setValue(null);
    this.formBaseInformation.get('department_id').setValue(null);
    this.formBaseInformation.get('doc_number').setValue('');
    this.formBaseInformation.get('description').setValue('');

    setTimeout(() => { this.inventoryProductsTableComponent.showColumns();}, 1000);
       
    this.resetStatus();
    this.getLinkedDocsScheme(true);
    this.canEditCompAndDepth=true;
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
    if(result)this.addFilesToInventory(result);
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
        return this.http.post('/api/auth/getListOfInventoryFiles', body) 
          .subscribe(
              (data) => {  
                          this.filesInfo = data as any[]; 
                        },
              error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
          );
}
addFilesToInventory(filesIds: number[]){
  const body = {"id1":this.id, "setOfLongs1":filesIds};// передаем id товара и id файлов 
          return this.http.post('/api/auth/addFilesToInventory', body) 
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
  return this.http.post('/api/auth/deleteInventoryFile',body)
  .subscribe(
      (data) => {   
                  this.loadFilesInfo();
                  this.openSnackBar(translate('docs.msg.deletet_succs'), translate('docs.msg.close'));
              },
      error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
  );  
}
  //------------------------------------------ Диаграммы связей ----------------------------------------
    
  //   render() {
  //     var dotIndex = 0;
  //     var dotLines = this.dots[dotIndex];
  //     var dot = dotLines.join('');
  //     var graphviz = d3.select("#graph").graphviz()
  //     .transition(function () {
  //         return d3.transition("main")
  //             .ease(d3.easeLinear)
  //             .delay(500)
  //             .duration(1500);
  //     })
  //     .logEvents(true)
  //     .on("initEnd", this.render);


  //     graphviz
  //         .renderDot(dot)
  //         .on("end", function () {
  //           dotIndex = (dotIndex + 1) % this.dots.length;
  //           this.render();
  //         });
  // }
    
  myTabFocusChange(changeEvent: MatTabChangeEvent) {
    // console.log('Tab position: ' + changeEvent.tab.position);
  }  
  myTabSelectedIndexChange(index: number) {
    // console.log('Selected index: ' + index);
    this.tabIndex=index;
  }
  myTabSelectedTabChange(changeEvent: MatTabChangeEvent) {
    // console.log('Index: ' + changeEvent.index);
  }  
  myTabAnimationDone() {
    // console.log('Animation is done.');
    if(this.tabIndex==1)  {
      if(!this.linkedDocsSchemeDisplayed) {
        this.loadingDocsScheme=true;
        setTimeout(() => {
            this.drawLinkedDocsScheme(); 
          }, 1);   
      }      
    }    
  }
  getLinkedDocsScheme(draw?:boolean){
    let result:any;
    this.loadingDocsScheme=true;
    this.linkedDocsSchemeDisplayed = false;
    this.linkedDocsText ='';
    this.loadingDocsScheme=true;
    this.http.get('/api/auth/getLinkedDocsScheme?uid='+this.formBaseInformation.get('uid').value)
      .subscribe(
          data => { 
            result=data as any;
            
            if(result==null){
              this.loadingDocsScheme=false;
              this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.err_load_lnkd')}});
            } else if(result.errorCode==0){//нет результата
              this.linkedDocsSchemeDisplayed = true;
              this.loadingDocsScheme=false;
            } else {
              this.linkedDocsCount=result.count==0?result.count:result.count-1;// т.к. если документ в группе будет только один (данный) - result.count придёт = 1, т.е. связанных нет. Если документов в группе вообще нет - придет 0.
              this.linkedDocsText = result.text;
              if(draw)
                this.drawLinkedDocsScheme()
              else
                this.loadingDocsScheme=false;
            } 
        },
        error => {this.loadingDocsScheme=false;console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }

  drawLinkedDocsScheme(){
    if(this.tabIndex==1){
      try{
        console.log(this.linkedDocsText);
        this.loadingDocsScheme=false;
        this.linkedDocsSchemeDisplayed = true;
        this.showGraphDiv=false;
        setTimeout(() => {
          this.showGraphDiv=true;
          setTimeout(() => {
            graphviz("#graph").renderDot(this.linkedDocsText);
            }, 1);
          }, 1);
      } catch (e){
        this.loadingDocsScheme=false;
        console.log(e.message);
      }
    } else this.loadingDocsScheme=false;
  }

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
    return (this.formBaseInformation.value.inventoryProductTable.map(t => +t.product_count).reduce((acc, value) => acc + value, 0)).toFixed(3).replace(".000", "").replace(".00", "");
  }
  getTotalSumPrice() {//бежим по столбцу product_sumprice и складываем (аккумулируем) в acc начиная с 0 значения этого столбца
    this.getProductsTable();
    return (this.formBaseInformation.value.inventoryProductTable.map(t => +t.product_sumprice).reduce((acc, value) => acc + value, 0)).toFixed(2);
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
    this.formBaseInformation.value.inventoryProductTable.map(i => 
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


            // result=`digraph {
            //   rankdir=UD;
            //   node [ shape=box;
            //   margin=0;
            //   fixedsize = true;
            //   width=2.3;
            //   height=1.3;
            //   fontsize=12
            //   fontname="Arial";
            //   style=filled;
            //   fillcolor="#ededed";
            //   color="#2b2a2a";
            //   ];
            
            //   struct1 [
            //     URL="ui/writeoffdoc/113";
            //     label = "Инвентаризация\n№97\n01.10.2021\n1350.00\nПроведено: Да\nОкончена";
            //     tooltip="Перейти в документ";
            //   ];
        
              
            //   struct2 [
            //     URL="ui/writeoffdoc/113";
            //     label = "Списание\n№336\n000231\n23.05.2021\nПроведено: Да\nПроведено";
            //     tooltip="Перейти в документ";
            //   ];

            //   struct3 [
            //     color="black"
            //     fillcolor="#acee00";
            //     URL="ui/writeoffdoc/113";
            //     label = "Оприходование\n №135\n000231\n23.05.2021\nПроведено: Да\nПроведено";
            //     tooltip="Перейти в документ";
            //   ];
              
            //   struct4 [
            //     URL="ui/writeoffdoc/113";
            //     label = "Заказ покупателя\n №15\n000231\n23.05.2021\nПроведено: Да\nДоставлен заказчику";
            //     tooltip="Перейти в документ";
            //   ];
            //   struct1 -> struct2;
            //   struct1 -> struct3;
            //   struct4 -> struct3;
            // }`