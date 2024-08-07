import { ChangeDetectorRef, Component, EventEmitter, Inject, OnInit, Optional, Output, ViewChild} from '@angular/core';
import { ActivatedRoute} from '@angular/router';
import { LoadSpravService } from '../../../../services/loadsprav';
import { UntypedFormGroup, FormArray,  UntypedFormBuilder,  Validators, UntypedFormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialog } from 'src/app/ui/dialogs/confirmdialog-with-custom-text.component';
import { debounceTime, tap, switchMap } from 'rxjs/operators';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SettingsOrderinDialogComponent } from 'src/app/modules/settings/settings-orderin-dialog/settings-orderin-dialog.component';
import { BalanceCagentComponent } from 'src/app/modules/info-modules/balance/balance-cagent/balance-cagent.component';
import { BalanceKassaComponent } from 'src/app/modules/info-modules/balance/balance-kassa/balance-kassa.component';
import { BalanceBoxofficeComponent } from 'src/app/modules/info-modules/balance/balance-boxoffice/balance-boxoffice.component';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { CommonUtilitesService } from 'src/app/services/common_utilites.serviсe';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { graphviz }  from 'd3-graphviz';
import { FilesComponent } from '../files/files.component';
import { FilesDocComponent } from '../files-doc/files-doc.component';
import { translate } from '@ngneat/transloco'; //+++
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { MomentDefault } from 'src/app/services/moment-default';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
const MY_FORMATS = MomentDefault.getMomentFormat();
const moment = MomentDefault.getMomentDefault();

interface DocResponse {//интерфейс для получения ответа в методе getOrderinValuesById
  id: number;
  company: string;
  company_id: string;
  creator: string;
  creator_id: string;
  cagent: string;
  cagent_id: string;
  master: string;
  master_id: string;
  is_completed: boolean;
  changer:string;
  changer_id: string;
  doc_number: string;
  nds: number;
  summ:number;
  date_time_changed: string;
  date_time_created: string;
  description : string;
  moving_type:string; //перемещение на: кассу - boxoffice, счёт - account 
  boxoffice_from_id:number; // id кассы предприятия
  payment_account_from_id:number; // id расчётного счёта
  kassa_from_id:number;// id кассы ККМ, из которой делаем перенос (выемку)
  boxoffice_from:number; // касса предприятия
  payment_account_from:number; // расчётный счёт
  kassa_from:number;// касса ККМ, из которой делаем перенос (выемку)
  is_archive: boolean;
  status_id: number;
  status_name: string;
  status_color: string;
  status_description: string;
  boxoffice_id:number;// id кассы в которую перемещаем ден. средства
  boxoffice:string; //  касса в которую перемещаем ден. средства
  internal: boolean; // внутренний платеж
  withdrawal_id: number;             // id выемки, из которой поступили средства
  paymentout_id: number;             // id исходящего платежа, из которого поступили средства
  orderout_id: number;               // id расходного ордера, из которого поступили средства
  withdrawal: number;                // номер выемки, из которой поступили средства
  paymentout: number;                // номер исходящего платежа, из которого поступили средства
  orderout: number;                  // номер расходного ордера, из которого поступили средства
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
  selector: 'app-orderin-doc',
  templateUrl: './orderin-doc.component.html',
  styleUrls: ['./orderin-doc.component.css'],
  providers: [LoadSpravService, CommonUtilitesService,BalanceCagentComponent,BalanceKassaComponent,BalanceBoxofficeComponent,
    { provide: DateAdapter, useClass: MomentDateAdapter,deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]}, //+++
    {provide: MAT_DATE_FORMATS, useValue: MY_FORMATS},
  ]
})
export class OrderinDocComponent implements OnInit {

  id: number = 0;// id документа
  createdDocId: number;//получение id созданного документа
  receivedCompaniesList: IdAndName [];//массив для получения списка предприятий
  receivedStatusesList: StatusInterface [] = []; // массив для получения статусов
  myCompanyId:number=0;
  myId:number=0;
  filesInfo : FilesInfo [] = []; //массив для получения информации по прикрепленным к документу файлам 
  creatorId:number=0;
  startProcess: boolean=true; // идеут стартовые запросы. после того как все запросы пройдут - будет false.
  canGetChilds: boolean=false; //можно ли грузить дочерние модули
  actionsBeforeGetChilds:number=0;// количество выполненных действий, необходимых чтобы загрузить дочерние модули (кассу и форму товаров)
  spravSysEdizmOfProductAll: IdAndNameAndShortname[] = [];// массив, куда будут грузиться все единицы измерения товара
  receivedPriceTypesList: IdNameDescription [] = [];//массив для получения списка типов цен
  canEditCompAndDepth=true;
  movingTypes:any[]=[]; // список типов перемещений: из кассы предприятия - boxoffice, с расч. счета - account, из кассы ККМ - kassa
  paymentAccounts:any[]=[];  // список расчётных счетов предприятия
  kassaList:any[]=[];  // список касс ККМ по отделениям, которые привязаны к кассе предприятия boxoffice_id
  accountingCurrency='';// short name of Accounting currency of user's company (e.g. $ or EUR)

  // расчет налогов
  companySettings:any={vat:false,vat_included:false}
  showVatCalculator=false;
  spravTaxesSet:any[]=[];
  vatId:number=null;
  
  withdrawalList: any[];             // список выемок, из которых поступили средства
  paymentoutList: any[];             // список исходящих платежей, из которых поступили средства
  orderoutList: any[];               // список расходных ордеров, из которых поступили средства
  withdrawalListLoading:boolean = false; //загрузка списка выемок 
  paymentoutListLoading:boolean = false; //загрузка списка исходящих платежей 
  orderoutListLoading:  boolean = false; //загрузка списка расходных ордеров 

  mode: string = 'standart';  // режим работы документа: standart - обычный режим, window - оконный режим просмотра
  boxoffices:any[]=[];// список касс предприятия (не путать с ККМ)
  fieldDataLoading=false; //загрузка списка касс или расч счетов
  rightsDefined:boolean; // определены ли права //!!!
  lastCheckedDocNumber:string='';

  //для загрузки связанных документов
  linkedDocsReturn:LinkedDocs[]=[];
  panelReturnOpenState=false;

  // Формы
  formAboutDocument:any;//форма, содержащая информацию о документе (создатель/владелец/изменён кем/когда)
  formBaseInformation: UntypedFormGroup; //массив форм для накопления информации о Возврате поставщику
  settingsForm: any; // форма с настройками
  formLinkedDocs: any;  // Форма для отправки при создании связанных документов

  //для поиска контрагента (поставщика) по подстроке
  searchCagentCtrl = new UntypedFormControl();//поле для поиска
  isCagentListLoading = false;//true когда идет запрос и загрузка списка. Нужен для отображения индикации загрузки
  canCagentAutocompleteQuery = false; //можно ли делать запрос на формирование списка для Autocomplete, т.к. valueChanges отрабатывает когда нужно и когда нет.
  filteredCagents: any;

  //для построения диаграмм связанности
  tabIndex=0;// индекс текущего отображаемого таба (вкладки)
  linkedDocsCount:number = 0; // кол-во документов в группе, ЗА ИСКЛЮЧЕНИЕМ текущего
  linkedDocsText:string = ''; // схема связанных документов (пример - в самом низу)
  loadingDocsScheme:boolean = false;
  linkedDocsSchemeDisplayed:boolean = false;
  showGraphDiv:boolean=true;

  //переменные прав
  permissionsSet: any[];//сет прав на документ
  allowToViewAllCompanies:boolean = false;
  allowToViewMyCompany:boolean = false;
  allowToUpdateAllCompanies:boolean = false;
  allowToUpdateMyCompany:boolean = false;
  allowToCreateMyCompany:boolean = false;
  allowToCreateAllCompanies:boolean = false;
  allowToCompleteAllCompanies:boolean = false;
  allowToCompleteMyCompany:boolean = false;
  allowToView:boolean = false;
  allowToUpdate:boolean = false;
  allowToCreate:boolean = false;
  allowToComplete:boolean = false;
  showOpenDocIcon:boolean=false;
  editability:boolean = false;//редактируемость. true если есть право на создание и документ создаётся, или есть право на редактирование и документ создан

  isDocNumberUnicalChecking = false;//идёт ли проверка на уникальность номера
  doc_number_isReadOnly=true;
  @ViewChild("doc_number", {static: false}) doc_number; //для редактирования номера документа
  @ViewChild("form", {static: false}) form; // связь с формой <form #form="ngForm" ...
  @ViewChild(BalanceCagentComponent, {static: false}) public balanceCagentComponent:BalanceCagentComponent;
  @ViewChild(BalanceKassaComponent, {static: false}) public balanceKassaComponent:BalanceKassaComponent;
  @ViewChild(BalanceBoxofficeComponent, {static: false}) public balanceBoxofficeComponent:BalanceBoxofficeComponent;
  @Output() baseData: EventEmitter<any> = new EventEmitter(); //+++ for get base datа from parent component (like myId, myCompanyId etc)

  constructor(private activateRoute: ActivatedRoute,
    private cdRef:ChangeDetectorRef,
    private _fb: UntypedFormBuilder, //чтобы билдить группу форм orderinProductTable    
    public SettingsOrderinDialogComponent: MatDialog,
    private http: HttpClient,
    public ConfirmDialog: MatDialog,
    public dialogAddFiles: MatDialog,
    private commonUtilites: CommonUtilitesService,
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
      id: new UntypedFormControl                       (this.id,[]),
      company_id: new UntypedFormControl               ('',[Validators.required]),
      cagent_id: new UntypedFormControl                ('',[]),
      doc_number: new UntypedFormControl               ('',[Validators.maxLength(10),Validators.pattern('^[0-9]{1,10}$')]),
      description: new UntypedFormControl              ('',[]),
      cagent: new UntypedFormControl                   ('',[]),
      nds: new UntypedFormControl                      (0,[Validators.required, Validators.pattern('^[0-9]{1,9}(?:[.,][0-9]{0,2})?\r?$')]),
      summ: new UntypedFormControl                     ('',[Validators.required, Validators.pattern('^[0-9]{1,9}(?:[.,][0-9]{0,2})?\r?$')]),
      status_id: new UntypedFormControl                ('',[]),
      status_name: new UntypedFormControl              ('',[]),
      moving_type: new UntypedFormControl              ('',[]),// тип перемещения (из кассы предприятия, расч. счёта, кассы ККМ)
      boxoffice_from_id: new UntypedFormControl        ('',[]), // id кассы предприятия
      payment_account_from_id: new UntypedFormControl  ('',[]), // id расчётного счёта
      kassa_from_id: new UntypedFormControl            ('',[]),// id кассы ККМ откуда делаем выемку
      boxoffice_from: new UntypedFormControl           ('',[]), // касса предприятия
      payment_account_from: new UntypedFormControl     ('',[]), // расчётный счёт
      kassa_from: new UntypedFormControl               ('',[]),// касса ККМ откуда делаем выемку
      status_color: new UntypedFormControl             ('',[]),
      status_description: new UntypedFormControl       ('',[]),
      is_completed: new UntypedFormControl             (false,[]),
      boxoffice_id: new UntypedFormControl             ('',[Validators.required]),// id кассы в которую перемещаем ден. средства
      boxoffice: new UntypedFormControl                ('',[]),// касса в которую перемещаем ден. средства
      internal: new UntypedFormControl                 (false,[]), // внутренний платеж
      withdrawal_id: new UntypedFormControl            ('',[]),             // id выемки, из которой поступили средства
      paymentout_id: new UntypedFormControl            ('',[]),             // id исходящего платежа, из которого поступили средства
      orderout_id: new UntypedFormControl              ('',[]),             // id расходного ордера, из которого поступили средства
      withdrawal: new UntypedFormControl               ('',[]),             // номер выемки, из которой поступили средства
      paymentout: new UntypedFormControl               ('',[]),             // номер исходящего платежа, из которого поступили средства
      orderout: new UntypedFormControl                 ('',[]),             // номер расходного ордера, из которого поступили средства

      uid: new UntypedFormControl                      ('',[]),// uuid идентификатор
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

    this.formLinkedDocs = new UntypedFormGroup({
      nds: new UntypedFormControl                ('',[]),
      description: new UntypedFormControl        ('',[]),
      parent_tablename: new UntypedFormControl   ('',[]), //для счёта фактуры выданного
      orderin_id: new UntypedFormControl         ('',[]), //для счёта фактуры выданного
      is_completed: new UntypedFormControl       (null,[]),
      cagent_id: new UntypedFormControl          (null,[Validators.required]),
      company_id: new UntypedFormControl         (null,[Validators.required]),
      linked_doc_id: new UntypedFormControl      (null,[]),//id связанного документа (в данном случае Отгрузка)
      parent_uid: new UntypedFormControl         (null,[]),// uid родительского документа
      child_uid: new UntypedFormControl          (null,[]),// uid дочернего документа
      linked_doc_name: new UntypedFormControl    (null,[]),//имя (таблицы) связанного документа
      uid: new UntypedFormControl                ('',[]),  //uid создаваемого связанного документа
    });

    // Форма настроек
    this.settingsForm = new UntypedFormGroup({
      //покупатель по умолчанию
      cagentId: new UntypedFormControl                 (null,[]),
      //наименование покупателя
      cagent: new UntypedFormControl                   ('',[]),
      //предприятие, для которого создаются настройки
      companyId: new UntypedFormControl                (null,[]),
      //статус после успешного отбития чека, перед созданием нового документа
      statusIdOnComplete: new UntypedFormControl       ('',[]),
    });

    if(this.data)//если документ вызывается в окне из другого документа
    {
      this.mode=this.data.mode;
      if(this.mode=='window'){this.id=this.data.id; this.formBaseInformation.get('id').setValue(this.id);}
    } 
    this.onCagentSearchValueChanges();//отслеживание изменений поля "Поставщик"
    this.getSetOfPermissions();
    //+++ getting base data from parent component
    this.getBaseData('myId');    
    this.getBaseData('myCompanyId');  
    this.getBaseData('companiesList');    
    this.getBaseData('accountingCurrency');  
  }
  //чтобы не было ExpressionChangedAfterItHasBeenCheckedError
  ngAfterContentChecked() {
    this.cdRef.detectChanges();
  }
  //чтобы "на лету" чекать валидность всех полей в зависимости от разных вариантов типа внутреннего перевода
  get isFormInvalid() {
    return (!this.formBaseInformation.valid 
      || (!this.formBaseInformation.get('internal').value && +this.formBaseInformation.get('cagent_id').value==0)
      || (this.formBaseInformation.get('internal').value && this.formBaseInformation.get('moving_type').value=='kassa' && (+this.formBaseInformation.get('kassa_from_id').value==0 || +this.formBaseInformation.get('withdrawal_id').value==0))
      || (this.formBaseInformation.get('internal').value && this.formBaseInformation.get('moving_type').value=='boxoffice' && (+this.formBaseInformation.get('boxoffice_from_id').value==0 || +this.formBaseInformation.get('orderout_id').value==0))
      || (this.formBaseInformation.get('internal').value && this.formBaseInformation.get('moving_type').value=='account' && (+this.formBaseInformation.get('payment_account_from_id').value==0 || +this.formBaseInformation.get('paymentout_id').value==0)));    
  }

  //---------------------------------------------------------------------------------------------------------------------------------------                            
  // ----------------------------------------------------- *** ПРАВА *** ------------------------------------------------------------------
  //---------------------------------------------------------------------------------------------------------------------------------------

  getSetOfPermissions(){
    return this.http.get('/api/auth/getMyPermissions?id=35')
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
    this.allowToView=(
      (this.allowToViewAllCompanies)||
      (this.allowToViewMyCompany&&documentOfMyCompany)
    )?true:false;
    this.allowToUpdate=(
      (this.allowToUpdateAllCompanies)||
      (this.allowToUpdateMyCompany&&documentOfMyCompany)
    )?true:false;
    this.allowToComplete=(
      (this.allowToCompleteAllCompanies)||
      (this.allowToCompleteMyCompany&&documentOfMyCompany)
    )?true:false;
    this.allowToCreate=(this.allowToCreateAllCompanies || this.allowToCreateMyCompany)?true:false;
    this.editability=((this.allowToCreate && +this.id==0)||(this.allowToUpdate && this.id>0));
    // console.log("myCompanyId - "+this.myCompanyId);
    // console.log("documentOfMyCompany - "+documentOfMyCompany);
    // console.log("allowToView - "+this.allowToView);
    // console.log("allowToUpdate - "+this.allowToUpdate);
    // console.log("allowToCreate - "+this.allowToCreate);
    // return true;

    this.rightsDefined=true;//!!!
    this.necessaryActionsBeforeGetChilds();
  }
 //  -------------     ***** поиск по подстроке для поставщика ***    --------------------------
 onCagentSearchValueChanges(){
  this.searchCagentCtrl.valueChanges
  .pipe(
    debounceTime(500),
    tap(() => {
      this.filteredCagents = [];}),       
    switchMap(fieldObject =>  
      this.getCagentsList()))
  .subscribe(data => {
    this.isCagentListLoading = false;
    if (data == undefined) {
      this.filteredCagents = [];
    } else {
      this.filteredCagents = data as any;
  }});}
  onSelectCagent(id:any,name:string){
    this.formBaseInformation.get('cagent_id').setValue(+id);}
  checkEmptyCagentField(){
    if(this.searchCagentCtrl.value.length==0){
      this.formBaseInformation.get('cagent_id').setValue(null);
  }}
  getCagentsList(){ //заполнение Autocomplete для поля Товар
    try {
      if(this.canCagentAutocompleteQuery && this.searchCagentCtrl.value.length>1){
        const body = {
          "searchString":this.searchCagentCtrl.value,
          "companyId":this.formBaseInformation.get('company_id').value};
        this.isCagentListLoading  = true;
        return this.http.post('/api/auth/getCagentsList', body);
      }else return [];
    } catch (e) {
    return [];}}
//-------------------------------------------------------------------------------
  //нужно загруить всю необходимую информацию, прежде чем вызывать детей (Поиск и добавление товара, Кассовый модуль), иначе их ngOnInit выполнится быстрее, чем загрузится вся информация в родителе
  //вызовы из:
  //refreshPermissions()
  necessaryActionsBeforeGetChilds(){
    this.actionsBeforeGetChilds++;
    //Если набрано необходимое кол-во действий для отображения модуля Формы поиска и добавления товара
    if(this.actionsBeforeGetChilds==1){
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
              // this.formAboutDocument.get('company').setValue(this.getCompanyNameById(this.formBaseInformation.get('company_id').value));
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
    this.allowToCreateAllCompanies = this.permissionsSet.some(         function(e){return(e==476)});
    this.allowToCreateMyCompany = this.permissionsSet.some(            function(e){return(e==477)});
    this.allowToViewAllCompanies = this.permissionsSet.some(           function(e){return(e==480)});
    this.allowToViewMyCompany = this.permissionsSet.some(              function(e){return(e==481)});
    this.allowToUpdateAllCompanies = this.permissionsSet.some(         function(e){return(e==482)});
    this.allowToUpdateMyCompany = this.permissionsSet.some(            function(e){return(e==483)});
    this.allowToCompleteAllCompanies = this.permissionsSet.some(       function(e){return(e==484)});
    this.allowToCompleteMyCompany = this.permissionsSet.some(          function(e){return(e==485)});
   
    if(this.allowToCreateAllCompanies){this.allowToCreateMyCompany=true;}
    if(this.allowToViewAllCompanies){this.allowToViewMyCompany=true;}
    if(this.allowToUpdateAllCompanies){this.allowToUpdateMyCompany=true;}
    if(this.allowToCompleteAllCompanies){this.allowToCompleteMyCompany=true;}
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
    this.formBaseInformation.get('status_id').setValue(null);
    this.formBaseInformation.get('cagent_id').setValue(null);
    this.searchCagentCtrl.reset();
    this.actionsBeforeGetChilds=0;
    this.formBaseInformation.get('boxoffice_id').setValue(null);
    this.getBoxofficesList();
    this.getStatusesList();
    this.getCompanySettings();
    this.getSpravTaxes();
    this.getCompaniesPaymentAccounts(); // загрузка расч. счетов
    //если идет стартовая прогрузка - продолжаем цепочку запросов. Если это была, например, просто смена предприятия - продолжать далее текущего метода смысла нет
    if(this.startProcess) {
      this.refreshPermissions();
    }
  }

  getStatusesList(){
    this.receivedStatusesList=null;
    this.loadSpravService.getStatusList(this.formBaseInformation.get('company_id').value,35) //35 - id документа из таблицы documents
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
      this.getSettings(); // настройки документа Приходный ордер
  }

  //загрузка настроек
  getSettings(onlyGetSettings?:boolean){
    let result:any;
    this.http.get('/api/auth/getSettingsOrderin')
      .subscribe(
          data => { 
            result=data as any;
            //вставляем настройки в форму настроек
            //данная группа настроек не зависит от предприятия
            // (этой группы тут нет)
            //если предприятия из настроек больше нет в списке предприятий (например, для пользователя урезали права, и выбранное предприятие более недоступно)
            //настройки не принимаем 
            if(this.isCompanyInList(+result.companyId)){
              this.settingsForm.get('companyId').setValue(result.companyId);
              //данная группа настроек зависит от предприятия
              this.settingsForm.get('cagentId').setValue(result.cagentId);
              this.settingsForm.get('cagent').setValue(result.cagent);
              this.settingsForm.get('statusIdOnComplete').setValue(result.statusIdOnComplete);
            } 
             
            if(!onlyGetSettings){
              this.setDefaultInfoOnStart();
              this.setDefaultCompany();
            }
          },
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
      );
  }
  setDefaultCompany(){
    if(+this.formBaseInformation.get('company_id').value==0)//если в настройках не было предприятия - ставим дефолтное
      if(this.allowToCreateAllCompanies)
        this.formBaseInformation.get('company_id').setValue(Cookie.get('orderin_companyId')=="0"?this.myCompanyId:+Cookie.get('orderin_companyId'));
      else
        this.formBaseInformation.get('company_id').setValue(this.myCompanyId);
    this.getStatusesList();
    this.getBoxofficesList();  
    this.getCompaniesPaymentAccounts(); // загрузка расч. счетов
    this.getMovingTypesList();  // типы внутреннего перемещения
    this.getCompanySettings();
    this.getSpravTaxes();
    this.refreshPermissions();
  }
  // *********************  Расчет налогов  **********************
  getCompanySettings(){
    this.http.get('/api/auth/getCompanySettings?id='+this.formBaseInformation.get('company_id').value)
      .subscribe(
        data => {         
          this.companySettings = data as any;
        },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }
  getSpravTaxes(){
  // Цена товара и сумма это разные вещи. Цена товара может включать или не включать НДС, а сумма всегда уже с НДС
  // В платеж приходит СУММА. Можно вычленить из нее НДС по формуле 100 * 20 / 120 (где 20 это НДС)
      this.loadSpravService.getSpravTaxes(this.formBaseInformation.get('company_id').value)
        .subscribe((data) => {
          this.spravTaxesSet=data as any[];
        },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})});
  }
  taxCalculate(){
    if(+this.vatId>0){
      let totalNds=0;
      this.showVatCalculator=false;
      totalNds = this.getTaxFromPrice(this.formBaseInformation.get('summ').value);
      this.formBaseInformation.get('nds').setValue(totalNds);
    }
  }
  getTaxFromPrice(price:number):number {
    // вычисляет налог из цены. Например, для цены 100, уже содержащей в себе налог, и налога 20% вернёт: 100 * 20 / 120 = 16.67
    let value=0;
    this.spravTaxesSet.forEach(a=>{if(+a.id == this.vatId) {value=a.value}});
    return parseFloat((price*value/(100+value)).toFixed(2));
  }
 // *********************  Конец Расчета налогов  **********************
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
      if(+this.settingsForm.get('cagentId').value>0){
        this.searchCagentCtrl.setValue(this.settingsForm.get('cagent').value);
        this.formBaseInformation.get('cagent_id').setValue(this.settingsForm.get('cagentId').value);
        this.formBaseInformation.get('cagent').setValue(this.settingsForm.get('cagent').value);
      } else {
        this.searchCagentCtrl.setValue(null);
        this.formBaseInformation.get('cagent_id').setValue(null);
        this.formBaseInformation.get('cagent').setValue('');
      }
    }
  }

  getDocumentValuesById(){
    this.http.get('/api/auth/getOrderinValuesById?id='+ this.id)
        .subscribe(
            data => { 
                let documentValues: DocResponse=data as any;// <- засовываем данные в интерфейс для принятия данных
                if(data!=null&&documentValues.company_id!=null){//!!!
                  this.formBaseInformation.get('id').setValue(+documentValues.id);
                  this.formBaseInformation.get('company_id').setValue(documentValues.company_id);
                  this.formBaseInformation.get('cagent_id').setValue(documentValues.cagent_id);
                  this.formBaseInformation.get('cagent').setValue(documentValues.cagent);
                  this.formBaseInformation.get('doc_number').setValue(documentValues.doc_number);
                  this.formBaseInformation.get('nds').setValue(documentValues.nds);
                  this.formBaseInformation.get('summ').setValue(documentValues.summ);
                  this.formBaseInformation.get('description').setValue(documentValues.description);
                  this.formBaseInformation.get('moving_type').setValue(documentValues.moving_type);
                  this.formBaseInformation.get('boxoffice_from_id').setValue(documentValues.boxoffice_from_id);
                  this.formBaseInformation.get('payment_account_from_id').setValue(documentValues.payment_account_from_id);
                  this.formBaseInformation.get('kassa_from_id').setValue(documentValues.kassa_from_id);
                  this.formBaseInformation.get('internal').setValue(documentValues.internal);
                  this.formBaseInformation.get('boxoffice_id').setValue(documentValues.boxoffice_id);
                  this.formBaseInformation.get('boxoffice').setValue(documentValues.boxoffice);

                  this.formBaseInformation.get('boxoffice_from').setValue(documentValues.boxoffice_from);
                  this.formBaseInformation.get('payment_account_from').setValue(documentValues.payment_account_from);
                  this.formBaseInformation.get('kassa_from').setValue(documentValues.kassa_from);

                  this.formBaseInformation.get('withdrawal_id').setValue(documentValues.withdrawal_id);
                  this.formBaseInformation.get('paymentout_id').setValue(documentValues.paymentout_id);
                  this.formBaseInformation.get('orderout_id').setValue(documentValues.orderout_id);
                  this.formBaseInformation.get('withdrawal').setValue(documentValues.withdrawal);
                  this.formBaseInformation.get('paymentout').setValue(documentValues.paymentout);
                  this.formBaseInformation.get('orderout').setValue(documentValues.orderout);
                  
                  this.searchCagentCtrl.setValue(documentValues.cagent);
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
                  this.loadFilesInfo();
                  this.getMovingTypesList();  // типы внутреннего перемещения
                  this.getSettings(true); // настройки документа
                  this.getBoxofficesList();   // кассы предприятия
                  this.getCompaniesPaymentAccounts(); //расч счета
                  this.getKassaListByBoxofficeId();   // все кассы KKM отеделений, привязанных к кассе препдриятия boxoffice_id
                  this.getWithdrawalListByKassaId(); // загрузка выемок
                  this.getOrderoutListByBoxofficeId(); // загрузка списка расходных ордеров
                  this.getPaymentoutListByAccountId(); // загрузка списка исходящих платежей
                  this.getStatusesList();//статусы документа Приходный ордер
                  this.getCompanySettings();
                  this.getSpravTaxes();
                  this.getLinkedDocsScheme(true);//загрузка диаграммы связанных документов
              
                } else {this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm')}})} //+++
                this.refreshPermissions();
            },
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})} //+++
        );
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

  //создание нового документа Приходный ордер
  createNewDocument(){
    this.createdDocId=null;
    this.formBaseInformation.get('uid').setValue(uuidv4());
    this.http.post('/api/auth/insertOrderin', this.formBaseInformation.value)
      .subscribe(
      (data) => {
                  this.actionsBeforeGetChilds=0;
                  this.createdDocId=data as number;
                  switch(this.createdDocId){
                    case null:{// null возвращает если не удалось создать документ из-за ошибки
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.crte_doc_err',{name:translate('docs.docs.orderin')})}});
                      break;
                    }
                    case 0:{//недостаточно прав
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_perm_creat',{name:translate('docs.docs.orderin')})}});
                      break;
                    }
                    default:{// Списание успешно создалась в БД 
                      this.openSnackBar(translate('docs.msg.doc_crtd_suc'),translate('docs.msg.close'));
                      this.afterCreateOrderin();
                    }
                  }
                },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
      );
  }

  //действия после создания нового документа Инвентаризиция
  afterCreateOrderin(){
      this.id=+this.createdDocId;
      this._router.navigate(['/ui/orderindoc', this.id]);
      this.formBaseInformation.get('id').setValue(this.id);
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
    this.http.post('/api/auth/setOrderinAsDecompleted',  this.formBaseInformation.value)
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
              case -30:{//недостаточно средств
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_money_op')}});
                break;
              }
              case -60:{//Документ уже снят с проведения
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.alr_cnc_com')}});
                break;
              }
              case 1:{// Успешно
                this.openSnackBar(translate('docs.msg.cnc_com_succs',{name:translate('docs.docs.orderin')}), translate('docs.msg.close'));
                this.getLinkedDocsScheme(true);//загрузка диаграммы связанных документов
                this.formBaseInformation.get('is_completed').setValue(false);
                this.balanceBoxofficeComponent.getBalance();//пересчитаем баланс кассы
                if(!this.formBaseInformation.get('internal').value) // если не внутреннее перемещение - пересчитаем баланс контрагента
                    this.balanceCagentComponent.getBalance();
                this.getPaymentoutListByAccountId(); // загрузим список платежей для этого расчётного счёта
                this.getOrderoutListByBoxofficeId(); // загрузим список платежей для этого расчётного счёта
                this.getWithdrawalListByKassaId(); // загрузим список платежей для этого расчётного счёта
              }
            }
          },
          error => {
            this.showQueryErrorMessage(error);
          },
      );
  }
  updateDocument(complete?:boolean){ 
    let currentStatus:number=this.formBaseInformation.get('status_id').value;
    if(complete){
      this.formBaseInformation.get('is_completed').setValue(true);//если сохранение с проведением - временно устанавливаем true, временно - чтобы это ушло в запросе на сервер, но не повлияло на внешний вид документа, если вернется не true
      if(this.settingsForm.get('statusIdOnComplete').value&&this.statusIdInList(this.settingsForm.get('statusIdOnComplete').value)){// если в настройках есть "Статус при проведении" - временно выставляем его
        this.formBaseInformation.get('status_id').setValue(this.settingsForm.get('statusIdOnComplete').value);}
    }
    this.http.post('/api/auth/updateOrderin',  this.formBaseInformation.value)
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
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.error_of') + (complete?translate('docs.msg._of_comp'):translate('docs.msg._of_save')) + translate('docs.msg._of_doc',{name:translate('docs.docs.orderin')})}});
                break;
              }
              case -1:{//недостаточно прав
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.ne_perm')}});
                break;
              }
              case -30:{//недостаточно средств 
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.ne_money_op')}});
                break;
              }
              case -31:{//Документ-отправитель внутреннего платежа не проведён (например, проводим приходный ордер, но незадолго до этого у исходящего платежа сняли проведение)
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.sender_n_comp')}});
                break;
              }
              case -40:{//дублирование исходящего платежа   
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.pi_w')+(this.formBaseInformation.get('moving_type').value=='account'?translate('docs.msg._po'):(this.formBaseInformation.get('moving_type').value=='boxoffice'?translate('docs.msg._oo'):translate('docs.msg._wd')))+translate('docs.msg._already_comp')}});
                break;
              }
              case -50:{//Документ уже проведён
                this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.already_cmplt')}});
                break;
              }
              default:{// Успешно
                this.openSnackBar(translate('docs.msg.doc_name',{name:translate('docs.docs.orderin')}) + (complete?translate('docs.msg.completed'):translate('docs.msg.saved')), translate('docs.msg.close'));
                this.getLinkedDocsScheme(true);//загрузка диаграммы связанных документов
                if(complete) {
                  this.formBaseInformation.get('is_completed').setValue(true);//если сохранение с проведением - окончательно устанавливаем признак проведённости = true
                  this.formBaseInformation.get('cagent').setValue(this.searchCagentCtrl.value); // иначе после проведения пропадёт наименование контрагента
                  setTimeout(() => { this.balanceBoxofficeComponent.getBalance();},10);//пересчитаем баланс кассы предприятия
                  if(this.settingsForm.get('statusIdOnComplete').value&&this.statusIdInList(this.settingsForm.get('statusIdOnComplete').value)){// если в настройках есть "Статус при проведении" - выставим его
                    this.formBaseInformation.get('status_id').setValue(this.settingsForm.get('statusIdOnComplete').value);}
                  this.setStatusColor();//чтобы обновился цвет статуса
                  if(!this.formBaseInformation.get('internal').value)//если перевод не внутренний
                    this.balanceCagentComponent.getBalance();//пересчитаем баланс контрагента, ведь мы получили от него деньги 
                }
              }
            }
          },
          error => {
            this.showQueryErrorMessage(error);
          },
      );
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
    const dialogSettings = this.SettingsOrderinDialogComponent.open(SettingsOrderinDialogComponent, {
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: '400px', 
      data:
      { //отправляем в диалог:
        priceTypesList:   this.receivedPriceTypesList, //список типов цен
        receivedCompaniesList: this.receivedCompaniesList, //список предприятий
        company_id: this.formBaseInformation.get('company_id').value, // текущее предприятие (нужно для поиска поставщика)
        allowToCreateAllCompanies: this.allowToCreateAllCompanies,
        allowToCreateMyCompany: this.allowToCreateMyCompany,
        id: this.id, //чтобы понять, новый док или уже созданный
      },
    });
    dialogSettings.afterClosed().subscribe(result => {
      if(result){
        //если нажата кнопка Сохранить настройки - вставляем настройки в форму настроек и сохраняем
        if(result.get('companyId')) this.settingsForm.get('companyId').setValue(result.get('companyId').value);
        if(result.get('cagentId')) this.settingsForm.get('cagentId').setValue(result.get('cagentId').value);
        if(result.get('cagent')) this.settingsForm.get('cagent').setValue(result.get('cagent').value);
        this.settingsForm.get('statusIdOnComplete').setValue(result.get('statusIdOnComplete').value);
        this.saveSettingsOrderin();
        // если это новый документ - применяем настройки 
        if(+this.id==0)  {
          //если в настройках сменили предприятие - нужно сбросить статусы, чтобы статус от предыдущего предприятия не прописался в актуальное
          if(+this.settingsForm.get('companyId').value!= +this.formBaseInformation.get('company_id').value) 
            this.resetStatus();
          this.getData();
        }
      }
    });
  }

  saveSettingsOrderin(){
    return this.http.post('/api/auth/saveSettingsOrderin', this.settingsForm.value)
            .subscribe(
                (data) => {   
                          this.openSnackBar(translate('docs.msg.settngs_saved'), translate('docs.msg.close'));
                          
                        },
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
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

  //создание нового документа
  goToNewDocument(){
    this._router.navigate(['ui/orderindoc']);
    this.id=0;
    this.form.resetForm();
    this.formBaseInformation.get('uid').setValue('');
    this.formBaseInformation.get('is_completed').setValue(false);
    this.formBaseInformation.get('nds').setValue('0.00');
    this.formBaseInformation.get('summ').setValue('');
    this.formBaseInformation.get('company_id').setValue(null);
    this.formBaseInformation.get('doc_number').setValue('');
    this.formBaseInformation.get('cagent_id').setValue(null);
    this.formBaseInformation.get('cagent').setValue('');
    this.formBaseInformation.get('description').setValue('');
    this.formBaseInformation.get('status_id').setValue(null);    
    this.searchCagentCtrl.reset();
    this.resetStatus();

    this.setDefaultStatus();//устанавливаем статус документа по умолчанию
    this.getLinkedDocsScheme(true);//загрузка диаграммы связанных документов

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

  onSwitchInternal(){
    if(this.formBaseInformation.get('internal').value){
      this.formBaseInformation.get('cagent_id').setValue(null);
      this.searchCagentCtrl.setValue('');
      this.formBaseInformation.get('nds').setValue(0);
      this.setDefaultMovingType(); // установит "С расчётного счёта"
      this.setDefaultPaymentFromAccount(); // установит расч. счёт по умолчанию
    }
  }
  getBoxofficesList(){
    return this.http.get('/api/auth/getBoxofficesList?id='+this.formBaseInformation.get('company_id').value).subscribe(
        (data) => { 
          this.boxoffices=data as any [];
          this.setDefaultBoxoffice();
        },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }

  setBoxofficeFromName(){
    if(this.boxoffices){
      this.boxoffices.forEach(a=>{
        if(a.id==this.formBaseInformation.get('boxoffice_from_id').value) this.formBaseInformation.get('boxoffice_from').setValue(a.name);
      })}
  }
  getMovingTypesList(){
    this.movingTypes=this.loadSpravService.getMovingTypeList();
    this.setDefaultMovingType();
  }
  setDefaultMovingType(){
    if((this.formBaseInformation.get('moving_type').value=='' || this.formBaseInformation.get('moving_type').value==null) && this.movingTypes.length>0){// - ставим по дефолту 2й тип, т.к. чаще всего будут переводить в кассу предприятия
      this.formBaseInformation.get('moving_type').setValue(this.movingTypes[1].id);
    }
  }  
  getMovingTypeNameById(id:string):string{
    let name:string = translate('docs.msg.not_set');
    if(this.movingTypes){
      this.movingTypes.forEach(a=>{
        if(a.id==id) name=a.name_from;
      })}
    return(name);
  }
  setDefaultBoxoffice(){
    if(+this.formBaseInformation.get('boxoffice_id').value==0 && this.boxoffices.length>0){// - ставим по дефолту самую первую кассу (т.к. она главная)
      this.formBaseInformation.get('boxoffice_id').setValue(this.boxoffices[0].id);
    }
  }
  setDefaultBoxofficeFrom(){
    if(+this.formBaseInformation.get('boxoffice_from_id').value==0 && this.boxoffices.length>0){// - ставим по дефолту самую первую кассу (т.к. она главная)
      this.formBaseInformation.get('boxoffice_from_id').setValue(this.boxoffices[0].id);
      this.setBoxofficeFromName();
      this.getOrderoutListByBoxofficeId();
    }
  }

  onMovingChange(){
    this.setNullOnIncomePayments();
    if(this.formBaseInformation.get('moving_type').value=='account'){        // moving_type = 'account'
      this.formBaseInformation.get('boxoffice_from_id').setValue(null);
      this.formBaseInformation.get('kassa_from_id').setValue(null);
      this.setDefaultPaymentFromAccount();
    } else if(this.formBaseInformation.get('moving_type').value=='boxoffice'){// moving_type = 'boxoffice'
      this.formBaseInformation.get('payment_account_from_id').setValue(null);
      this.formBaseInformation.get('kassa_from_id').setValue(null);
      this.setDefaultBoxofficeFrom();
    } else {                   
      this.formBaseInformation.get('payment_account_from_id').setValue(null);
      this.formBaseInformation.get('boxoffice_from_id').setValue(null);
      if( this.kassaList.length==0)                                               // moving_type = 'kassa' 
        this.getKassaListByBoxofficeId();
    }
  }
  setNullOnIncomePayments(){// очистка полей источника входящего платежа
    this.formBaseInformation.get('orderout_id').setValue(null);
    this.formBaseInformation.get('paymentout_id').setValue(null);
    this.formBaseInformation.get('withdrawal_id').setValue(null);
  }
  onBoxofficeChange(){
    if(this.formBaseInformation.get('moving_type').value=='kassa'){        // moving_type = 'kassa'
      this.formBaseInformation.get('kassa_from_id').setValue(null);
      this.kassaList=[];
      this.getKassaListByBoxofficeId();
    }
  }
  getCompaniesPaymentAccounts(){
    this.fieldDataLoading=true;
    return this.http.get('/api/auth/getCompaniesPaymentAccounts?id='+this.formBaseInformation.get('company_id').value).subscribe(
        (data) => { 
          this.fieldDataLoading=false;
          this.paymentAccounts=data as any [];
          // this.setDefaultPaymentFromAccount();
        },
        error => {this.fieldDataLoading=false;console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }

  setPaymentAccountFromName(){
    if(this.paymentAccounts){
      this.paymentAccounts.forEach(a=>{
        if(a.id==this.formBaseInformation.get('payment_account_from_id').value) this.formBaseInformation.get('payment_account_from').setValue(a.payment_account+', '+a.name);
      })}
  }

  setDefaultPaymentFromAccount(){
    if(+this.formBaseInformation.get('payment_account_from_id').value==0 && this.paymentAccounts.length>0){// - ставим по дефолту самый верхний расчётный счёт
      this.formBaseInformation.get('payment_account_from_id').setValue(this.paymentAccounts[0].id);
      this.getPaymentoutListByAccountId();
    }
  }
  getKassaListByBoxofficeId(){
    this.fieldDataLoading=true;
    return this.http.get('/api/auth/getKassaListByBoxofficeId?id='+this.formBaseInformation.get('boxoffice_id').value).subscribe(
      (data) => { 
        this.fieldDataLoading=false;
        this.kassaList=data as any [];
        // this.setDefaultPaymentFromAccount();
      },
      error => {this.fieldDataLoading=false;console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
    );
  }

  setKassaFromName(){
    if(this.kassaList){
      this.kassaList.forEach(a=>{
        if(a.id==this.formBaseInformation.get('kassa_from_id').value) this.formBaseInformation.get('kassa_from').setValue(a.name);
      })}
  }

  getWithdrawalListByKassaId(){
    if(+this.formBaseInformation.get('kassa_from_id').value>0 && !this.formBaseInformation.get('is_completed').value){
      this.withdrawalListLoading=true;
      this.http.get('/api/auth/getWithdrawalList?kassa_id='+this.formBaseInformation.get('kassa_from_id').value).subscribe(
        (data) => { 
          this.withdrawalListLoading=false;
          this.withdrawalList=data as any [];
          this.setDefaultWithdrawal();
        },
        error => {this.withdrawalListLoading=false;console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
      );
    }
  }
  setDefaultWithdrawal(){
    if(+this.formBaseInformation.get('withdrawal_id').value==0 && this.withdrawalList.length==1)
      this.formBaseInformation.get('withdrawal_id').setValue(this.withdrawalList[0].id);
  }
  onSelectWithdrawal(withdravalName:any,summ:number){
    this.formBaseInformation.get('withdrawal').setValue(withdravalName);
    this.formBaseInformation.get('summ').setValue(summ);
  }
  // При смене поля "В кассу"
  onRecipientChange(){
    // this.onBoxofficeChange();
    this.setNullOnIncomePayments(); // очистка полей источника входящего платежа
    if(this.formBaseInformation.get('internal').value){
      if(this.formBaseInformation.get('moving_type').value=='account'){
        this.formBaseInformation.get('boxoffice_from_id').setValue(null);
        this.getPaymentoutListByAccountId();
      }
      if(this.formBaseInformation.get('moving_type').value=='boxoffice'){
        this.formBaseInformation.get('payment_account_from_id').setValue(null);
        this.getOrderoutListByBoxofficeId();
      }
    }
    this.formBaseInformation.get('boxoffice').setValue(this.getBoxofficeNameById(this.formBaseInformation.get('boxoffice_id').value));
  }
  getBoxofficeNameById(id:number):string{
    let name:string='';
    if(this.boxoffices)this.boxoffices.map(i=>{if(i.id==id)name=i.name;});
    return name;
  }
  getPaymentoutListByAccountId(){
    if(+this.formBaseInformation.get('payment_account_from_id').value>0 && !this.formBaseInformation.get('is_completed').value){
      this.paymentoutListLoading=true;
      this.http.get('/api/auth/getPaymentoutList?account_id='+this.formBaseInformation.get('payment_account_from_id').value+
      "&recipient_id="+this.formBaseInformation.get('boxoffice_id').value).subscribe(
        (data) => { 
          this.paymentoutListLoading=false;
          this.paymentoutList=data as any [];
          this.setDefaultPaymentout();
        },
        error => {this.paymentoutListLoading=false;console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
      );
    }
  }
  setDefaultPaymentout(){
    if(+this.formBaseInformation.get('paymentout_id').value==0 && this.paymentoutList.length==1)
      this.formBaseInformation.get('paymentout_id').setValue(this.paymentoutList[0].id);
  }
  onSelectPaymentout(paymentoutName:any,summ:number){
    this.formBaseInformation.get('paymentout').setValue(paymentoutName);
    this.formBaseInformation.get('summ').setValue(summ);
  }

  getOrderoutListByBoxofficeId(){
    if(+this.formBaseInformation.get('boxoffice_from_id').value>0 && !this.formBaseInformation.get('is_completed').value){
      this.orderoutListLoading=true;
      this.http.get('/api/auth/getOrderoutList?boxoffice_id='+this.formBaseInformation.get('boxoffice_from_id').value+
      "&recipient_id="+this.formBaseInformation.get('boxoffice_id').value).subscribe(
        (data) => { 
          this.orderoutListLoading=false;
          this.orderoutList=data as any [];
          this.setDefaultOrderout();
        },
        error => {this.orderoutListLoading=false;console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
      );
    }
  }
  setDefaultOrderout(){
    if(+this.formBaseInformation.get('orderout_id').value==0 && this.orderoutList.length==1)
      this.formBaseInformation.get('orderout_id').setValue(this.orderoutList[0].id);
  }
  onSelectOrderout(orderoutName:any,summ:number){
    this.formBaseInformation.get('orderout').setValue(orderoutName);
    this.formBaseInformation.get('summ').setValue(summ);
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
    if(result)this.addFilesToOrderin(result);
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
    return this.http.get('/api/auth/getListOfOrderinFiles?id='+this.id) 
          .subscribe(
              (data) => {  
                          this.filesInfo = data as any[]; 
                        },
              error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
          );
}
addFilesToOrderin(filesIds: number[]){
  const body = {"id1":this.id, "setOfLongs1":filesIds};// передаем id товара и id файлов 
          return this.http.post('/api/auth/addFilesToOrderin', body) 
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
  return this.http.post('/api/auth/deleteOrderinFile',body)
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

  //создание связанных документов
  createLinkedDoc(docname:string){// принимает аргументы: Return
    let uid = uuidv4();
    let canCreateLinkedDoc:CanCreateLinkedDoc=this.canCreateLinkedDoc(docname); //проверим на возможность создания связанного документа
    if(canCreateLinkedDoc.can){
      
      this.formLinkedDocs.get('company_id').setValue(this.formBaseInformation.get('company_id').value);
      this.formLinkedDocs.get('cagent_id').setValue(this.formBaseInformation.get('cagent_id').value);
      this.formLinkedDocs.get('nds').setValue(this.formBaseInformation.get('nds').value);
      // this.formLinkedDocs.get('summ').setValue(this.formBaseInformation.get('summ').value);
      this.formLinkedDocs.get('description').setValue(translate('docs.msg.created_from')+translate('docs.docs.orderin')+' '+translate('docs.top.number')+this.formBaseInformation.get('doc_number').value);
      this.formLinkedDocs.get('is_completed').setValue(false);
      this.formLinkedDocs.get('uid').setValue(uid);
      
      this.formLinkedDocs.get('linked_doc_id').setValue(this.id);//id связанного документа (того, из которого инициируется создание данного документа)
      this.formLinkedDocs.get('linked_doc_name').setValue('orderin');//имя (таблицы) связанного документа

      //поля для счёта-фактуры выданного
      this.formLinkedDocs.get('parent_tablename').setValue('orderin');
      this.formLinkedDocs.get('orderin_id').setValue(this.id);

      if(docname=='Ordersup'){// Заказ поставщику для Приходного ордера является родительским, но может быть создан из Приходного ордера (Заказ поставщику будет выше по иерархии в диаграмме связей)
        this.formLinkedDocs.get('parent_uid').setValue(uid);// uid исходящего (родительского) документа
        this.formLinkedDocs.get('child_uid').setValue(this.formBaseInformation.get('uid').value);// uid дочернего документа. Дочерний - не всегда тот, которого создают из текущего документа. Например, при создании из Отгрузки Счёта покупателю - Отгрузка будет дочерней для него.
      } else {
        this.formLinkedDocs.get('parent_uid').setValue(this.formBaseInformation.get('uid').value);// uid исходящего (родительского) документа
        this.formLinkedDocs.get('child_uid').setValue(uid);// uid дочернего документа. Дочерний - не всегда тот, которого создают из текущего документа. Например, при создании из Отгрузки Счёта покупателю - Отгрузка будет дочерней для него.
      }
      
      this.http.post('/api/auth/insert'+docname, this.formLinkedDocs.value)
      .subscribe(
      (data) => {
                  let createdDocId=data as number;
                  switch(createdDocId){
                    case null:{// null возвращает если не удалось создать документ из-за ошибки
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.crte_doc_err',{name:translate('docs.docs.'+this.commonUtilites.getDocNameByDocAlias(docname))})}});
                      break;
                    }
                    case -1:{//недостаточно прав
                      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.ne_perm_creat',{name:translate('docs.docs.'+this.commonUtilites.getDocNameByDocAlias(docname))})}});
                      break;
                    }
                    default:{// Документ успешно создался в БД 
                      this.openSnackBar(translate('docs.msg.doc_crtd_succ',{name:translate('docs.docs.'+this.commonUtilites.getDocNameByDocAlias(docname))}), translate('docs.msg.close'));
                      // this.getLinkedDocsScheme(true);//обновляем схему этого документа
                      this._router.navigate(['/ui/'+docname.toLowerCase()+'doc', createdDocId]);
                    }
                  }
                },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
      );
    } else this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:canCreateLinkedDoc.reason}});
  }

  // можно ли создать связанный документ 
  canCreateLinkedDoc(docname:string):CanCreateLinkedDoc{
      return {can:true, reason:''};
  }

  OnClickVatInvoiceOut(){
    if(+this.formBaseInformation.get('cagent_id').value==0)
      this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.attention'),message:translate('docs.msg.cnt_crte_cntpt'),}});
    else
      this.createLinkedDoc('Vatinvoiceout');
  }
  //******************************************************** ДИАГРАММА СВЯЗЕЙ ************************************************************/
  commaToDot(fieldName:string){
    this.formBaseInformation.get(fieldName).setValue(this.formBaseInformation.get(fieldName).value.replace(",", "."));
  }
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
    this.formBaseInformation.value.orderinProductTable.map(i => 
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

