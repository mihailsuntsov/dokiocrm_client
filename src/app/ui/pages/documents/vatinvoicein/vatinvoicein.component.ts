import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import { QueryForm } from './query-form';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialog } from 'src/app/ui/dialogs/confirmdialog-with-custom-text.component';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoadSpravService } from '../../../../services/loadsprav';
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { QueryFormService } from './get-vatinvoicein-table.service';
import { DeleteDialog } from 'src/app/ui/dialogs/deletedialog.component';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { SettingsVatinvoiceinDialogComponent } from 'src/app/modules/settings/settings-vatinvoicein-dialog/settings-vatinvoicein-dialog.component';
import { CommonUtilitesService } from '../../../../services/common_utilites.serviсe'; //+++
import { translate, TranslocoService } from '@ngneat/transloco'; //+++

export interface CheckBox {
  id: number;
  is_completed:boolean;
  company_id: number;
  department_id: number;
  creator_id: number;
}
export interface idAndName {
  id: number;
  name:string;
}
export interface NumRow {//интерфейс для списка количества строк
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-vatinvoicein',
  templateUrl: './vatinvoicein.component.html',
  styleUrls: ['./vatinvoicein.component.css'],
  providers: [QueryFormService,LoadSpravService,Cookie,CommonUtilitesService] //+++
})
export class VatinvoiceinComponent implements OnInit {
  sendingQueryForm: QueryForm=new QueryForm(); // интерфейс отправляемых данных по формированию таблицы (кол-во строк, страница, поисковая строка, колонка сортировки, asc/desc)
  receivedPagesList: string [] ;//массив для получения данных пагинации
  dataSource = new MatTableDataSource<CheckBox>(); //массив данных для таблицы и чекбоксов (чекбоксы берут из него id, таблица -всё)
  displayedColumns: string[] = [];//массив отображаемых столбцов таблицы
  selection = new SelectionModel<CheckBox>(true, []);//Class to be used to power selecting one or more options from a list.
  receivedCompaniesList: idAndName [] = [];//массив для получения списка предприятий
  myCompanyId:number=0;//
  myId:number=0;
  checkedList:number[]=[]; //строка для накапливания id чекбоксов вида [2,5,27...]

  //переменные прав
  permissionsSet: any[];//сет прав на документ
  allowToViewAllCompanies:boolean = false;
  allowToViewMyCompany:boolean = false;
  allowToUpdateAllCompanies:boolean = false;
  allowToUpdateMyCompany:boolean = false;
  allowToCreateMyCompany:boolean = false;
  allowToCreateAllCompanies:boolean = false;
  allowToDeleteAllCompanies:boolean = false;
  allowToDeleteMyCompany:boolean = false;

  allowToView:boolean = false;
  allowToUpdate:boolean = false;
  allowToCreate:boolean = false;
  allowToDelete:boolean = false;

  showOpenDocIcon:boolean=false;

  gettingTableData:boolean=true;
  
  settingsForm: any; // форма с настройками

  numRows: NumRow[] = [
    {value: '5', viewValue: '5'},
    {value: '10', viewValue: '10'},
    {value: '25', viewValue: '25'}
  ];
  
  //переменные пагинации
  size: any;
  pagenum: any;  // - Страница, которая сейчас выбрана в пагинаторе
  maxpage: any;  // - Последняя страница в пагинаторe (т.е. maxpage=8 при пагинаторе [345678])
  listsize: any; // - Последняя страница в пагинации (но не в пагинаторе. т.е. в пагинаторе может быть [12345] а listsize =10)
 //переменные для управления динамическим отображением элементов
 visBtnAdd:boolean;
 visBtnDelete = false;
  //***********************************************  Ф И Л Ь Т Р   О П Ц И Й   *******************************************/
  selectionFilterOptions = new SelectionModel<idAndName>(true, []);//Класс, который взаимодействует с чекбоксами и хранит их состояние
  optionsIds: idAndName [];
  displayingDeletedDocs:boolean = false;//true - режим отображения удалённых документов. false - неудалённых
  displaySelectOptions:boolean = true;// отображать ли кнопку "Выбрать опции для фильтра"
  //***********************************************************************************************************************/
  @Output() baseData: EventEmitter<any> = new EventEmitter(); //+++ for get base datа from parent component (like myId, myCompanyId etc)
  
  constructor(private queryFormService:   QueryFormService,
    private loadSpravService:   LoadSpravService,
    private _snackBar: MatSnackBar,
    public universalCategoriesDialog: MatDialog,
    private MessageDialog: MatDialog,
    public confirmDialog: MatDialog,
    private http: HttpClient,
    private settingsVatinvoiceinDialogComponent: MatDialog,
    public deleteDialog: MatDialog,
    public dialogRef1: MatDialogRef<VatinvoiceinComponent>,
    public cu: CommonUtilitesService, //+++
    private service: TranslocoService,) { }

    ngOnInit() {
      this.sendingQueryForm.companyId='0';
      this.sendingQueryForm.departmentId='0';
      this.sendingQueryForm.sortAsc='desc';
      this.sendingQueryForm.sortColumn='date_time_created_sort';
      this.sendingQueryForm.offset='0';
      this.sendingQueryForm.result='10';
      this.sendingQueryForm.searchCategoryString="";
      this.sendingQueryForm.filterOptionsIds = [];

      if(Cookie.get('vatinvoicein_companyId')=='undefined' || Cookie.get('vatinvoicein_companyId')==null)     
        Cookie.set('vatinvoicein_companyId',this.sendingQueryForm.companyId); else this.sendingQueryForm.companyId=(Cookie.get('vatinvoicein_companyId')=="0"?"0":+Cookie.get('vatinvoicein_companyId'));
      if(Cookie.get('vatinvoicein_sortAsc')=='undefined' || Cookie.get('vatinvoicein_sortAsc')==null)       
        Cookie.set('vatinvoicein_sortAsc',this.sendingQueryForm.sortAsc); else this.sendingQueryForm.sortAsc=Cookie.get('vatinvoicein_sortAsc');
      if(Cookie.get('vatinvoicein_sortColumn')=='undefined' || Cookie.get('vatinvoicein_sortColumn')==null)    
        Cookie.set('vatinvoicein_sortColumn',this.sendingQueryForm.sortColumn); else this.sendingQueryForm.sortColumn=Cookie.get('vatinvoicein_sortColumn');
      if(Cookie.get('vatinvoicein_offset')=='undefined' || Cookie.get('vatinvoicein_offset')==null)        
        Cookie.set('vatinvoicein_offset',this.sendingQueryForm.offset); else this.sendingQueryForm.offset=Cookie.get('vatinvoicein_offset');
      if(Cookie.get('vatinvoicein_result')=='undefined' || Cookie.get('vatinvoicein_result')==null)        
        Cookie.set('vatinvoicein_result',this.sendingQueryForm.result); else this.sendingQueryForm.result=Cookie.get('vatinvoicein_result');
    
      //+++ getting base data from parent component
      this.getBaseData('myId');    
      this.getBaseData('myCompanyId');  
      this.getBaseData('companiesList');      
      // this.getBaseData('myDepartmentsList');
    
      this.fillOptionsList();//заполняем список опций фильтра
      // Форма настроек
    this.settingsForm = new UntypedFormGroup({
      //предприятие, для которого создаются настройки
      companyId: new UntypedFormControl                (null,[]),
      //статус после успешного отбития чека, перед созданием нового документа
      statusIdOnComplete: new UntypedFormControl       ('',[]),
    });

      this.getCompaniesList();// 
      // -> getSetOfPermissions() 
      // -> getMyId()
      // -> getMyCompanyId() 
      // -> setDefaultCompany() 
      // -> getCRUD_rights() 
      // -> getData() 
      //API: getCompaniesList         giveMeMyPermissions      getMyCompanyId
    }

    // -------------------------------------- *** ПРАВА *** ------------------------------------
   getSetOfPermissions(){
    return this.http.get('/api/auth/getMyPermissions?id=38')
    .subscribe(
        (data) => {   
                    this.permissionsSet=data as any [];
                    this.getMyId();
                },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},
    );
  }

  getCRUD_rights(permissionsSet:any[]){
    this.allowToCreateAllCompanies = permissionsSet.some(         function(e){return(e==529)});
    this.allowToCreateMyCompany = permissionsSet.some(            function(e){return(e==530)});
    this.allowToDeleteAllCompanies = permissionsSet.some(         function(e){return(e==531)});
    this.allowToDeleteMyCompany = permissionsSet.some(            function(e){return(e==532)});
    this.allowToViewAllCompanies = permissionsSet.some(           function(e){return(e==533)});
    this.allowToViewMyCompany = permissionsSet.some(              function(e){return(e==534)});
    this.allowToUpdateAllCompanies = permissionsSet.some(         function(e){return(e==535)});
    this.allowToUpdateMyCompany = permissionsSet.some(            function(e){return(e==536)});
    this.getData();
  }

  refreshPermissions():boolean{
    this.allowToView=(this.allowToViewAllCompanies||this.allowToViewMyCompany)?true:false;
    this.allowToUpdate=(this.allowToUpdateAllCompanies||this.allowToUpdateMyCompany)?true:false;
    this.allowToCreate=(this.allowToCreateAllCompanies||this.allowToCreateMyCompany)?true:false;
    this.allowToDelete=(this.allowToDeleteAllCompanies || this.allowToDeleteMyCompany)?true:false;
    this.showOpenDocIcon=(this.allowToUpdate||this.allowToView);
    this.visBtnAdd = (this.allowToCreate)?true:false;
    
    // console.log("allowToView - "+this.allowToView);
    // console.log("allowToUpdate - "+this.allowToUpdate);
    // console.log("allowToCreate - "+this.allowToCreate);
    // console.log("allowToDelete - "+this.allowToDelete);
    // console.log("allowToDeleteAllCompanies - "+this.allowToDeleteAllCompanies);
    return true;
  }
// -------------------------------------- *** КОНЕЦ ПРАВ *** ------------------------------------

  getData(){
    if(this.refreshPermissions() && this.allowToView)
    {
      this.doFilterCompaniesList(); //если нет просмотра по всем предприятиям - фильтруем список предприятий до своего предприятия
      this.getTableHeaderTitles();
      this.getPagesList();
      this.getTable();
    } else {this.gettingTableData=false;this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:translate('menu.msg.ne_perm')}})} //+++
  }

  getTableHeaderTitles(){
    this.displayedColumns=[];
    if(this.allowToDelete) this.displayedColumns.push('select');
    if(this.showOpenDocIcon) this.displayedColumns.push('opendoc');
    this.displayedColumns.push('doc_number');
    this.displayedColumns.push('cagent');
    // this.displayedColumns.push('company');
    this.displayedColumns.push('status');
    this.displayedColumns.push('is_completed');
    this.displayedColumns.push('summ');
    this.displayedColumns.push('description');
    this.displayedColumns.push('creator');
    this.displayedColumns.push('date_time_created');
  }

  getPagesList(){
    this.queryFormService.getPagesList(this.sendingQueryForm)
    .subscribe(
        data => {this.receivedPagesList=data as string [];
        this.size=this.receivedPagesList[0];
        this.pagenum=this.receivedPagesList[1];
        this.listsize=this.receivedPagesList[2];
        this.maxpage=(this.receivedPagesList[this.receivedPagesList.length-1])},
        error =>  {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})}  //+++
        ); 
  }

  getTable(){
    this.gettingTableData=true;
    this.queryFormService.getTable(this.sendingQueryForm)
    .subscribe(
      (data) => {
        this.dataSource.data = data as any []; 
        if(this.dataSource.data.length==0 && +this.sendingQueryForm.offset>0) this.setPage(0);
        this.gettingTableData=false;
      },
      error =>  {console.log(error);this.gettingTableData=false;this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})}  //+++
    );
  }

  isAllSelected() {//все выбраны
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return  numSelected === numRows;//true если все строки выбраны
  }  

  isThereSelected() {//есть выбранные
    return this.selection.selected.length>0;
  }  

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isThereSelected() ?
    this.resetSelecion() :
        this.dataSource.data.forEach(row => {
          // if(!row.is_completed){this.selection.select(row);}
          if(this.showCheckbox(row)){this.selection.select(row);}//если чекбокс отображаем, значит можно удалять этот документ
        });
        this.createCheckedList();
    this.isAllSelected();
    this.isThereSelected();
  }

  resetSelecion(){
    this.selection.clear(); 
  }

  clickTableCheckbox(row){
    this.selection.toggle(row); 
    this.createCheckedList();
    this.isAllSelected();
    this.isThereSelected();
  }

  createCheckedList(){
    this.checkedList = [];
    console.log("1");
    for (var i = 0; i < this.dataSource.data.length; i++) {
      console.log("2");
      if(this.selection.isSelected(this.dataSource.data[i]))
      this.checkedList.push(this.dataSource.data[i].id);
    }
    if(this.checkedList.length>0){
      console.log("3");
        this.hideAllBtns();
        if(this.allowToDelete) this.visBtnDelete = true;
    }else{console.log("4");this.showOnlyVisBtnAdd()}
    console.log("checkedList - "+this.checkedList);
  }

  hideAllBtns(){
    this.visBtnAdd = false;
    this.visBtnDelete = false;
  }
  showOnlyVisBtnAdd(){
    if(this.allowToCreate) this.visBtnAdd = true;
    this.visBtnDelete = false;
  }

  setNumOfPages(){
    this.clearCheckboxSelection();
    this.createCheckedList();
    this.sendingQueryForm.offset=0;
    Cookie.set('vatinvoicein_result',this.sendingQueryForm.result);
    this.getData();
  }

  setPage(value:any) // set pagination
  {
    this.clearCheckboxSelection();
    this.sendingQueryForm.offset=value;
    Cookie.set('vatinvoicein_offset',value);
    this.getData();
  }

  clearCheckboxSelection(){
    this.selection.clear();
    this.dataSource.data.forEach(row => this.selection.deselect(row));
  }

  setSort(valueSortColumn:any) // set sorting column
  {
      this.clearCheckboxSelection();
      if(valueSortColumn==this.sendingQueryForm.sortColumn){// если колонка, на которую ткнули, та же, по которой уже сейчас идет сортировка
          if(this.sendingQueryForm.sortAsc=="asc"){
              this.sendingQueryForm.sortAsc="desc"
          } else {  
              this.sendingQueryForm.sortAsc="asc"
          }
      Cookie.set('vatinvoicein_sortAsc',this.sendingQueryForm.sortAsc);
      } else {
          this.sendingQueryForm.sortColumn=valueSortColumn;
          this.sendingQueryForm.sortAsc="asc";
          Cookie.set('vatinvoicein_sortAsc',"asc");
          Cookie.set('vatinvoicein_sortColumn',valueSortColumn);
      }
      this.getData();
  }
  onCompanySelection(){
    Cookie.set('vatinvoicein_companyId',this.sendingQueryForm.companyId);
    this.resetOptions();
    this.getData();
  }
  clickBtnDelete(): void {
    const dialogRef = this.deleteDialog.open(DeleteDialog, {
      width: '300px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result==1){this.deleteDocs();}
      this.clearCheckboxSelection();
      this.showOnlyVisBtnAdd();
    });        
  }
  clickBtnRestore(): void {
    const dialogRef = this.confirmDialog.open(ConfirmDialog, {
      width: '400px',
      data:
      { 
        head: translate('menu.dialogs.restore'), //+++
        query: translate('menu.dialogs.q_restore'),
        warning: '',
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result==1){this.undeleteDocs();}
      this.clearCheckboxSelection();
      this.showOnlyVisBtnAdd();
    });        
  }
  undeleteDocs(){
    const body = {"checked": this.checkedList.join()}; //join переводит из массива в строку
    this.clearCheckboxSelection();
    return this.http.post('/api/auth/undeleteVatinvoicein', body) 
    .subscribe(
      (data) => {   
        let result=data as any;
        switch(result){ //+++
          case 1:{this.getData();this.openSnackBar(translate('menu.msg.rec_success'), translate('menu.msg.close'));break;}  //+++
          case null:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:(translate('menu.msg.error_msg'))}});break;}
          case -1:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.attention'),message:translate('menu.msg.ne_perm')}});break;}
        }
    },error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},); //+++
  }  
  deleteDocs(){
    const body = {"checked": this.checkedList.join()}; //join переводит из массива в строку
    this.clearCheckboxSelection();
    return this.http.post('/api/auth/deleteVatinvoicein', body) 
    .subscribe((data) => {   
      let result=data as any;
      switch(result.result){
        case 0:{this.getData();this.openSnackBar(translate('menu.msg.del_success'), translate('menu.msg.close'));break;} 
        case 1:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:(translate('menu.msg.error_msg'))}});break;}
        case 2:{this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.attention'),message:translate('menu.msg.ne_perm')}});break;}
        case 3:{let numbers:string='';
          for(var i=0;i<result.docs.length;i++){numbers=numbers+' <a href="ui/vatinvoiceindoc/'+result.docs[i].id+'">'+result.docs[i].doc_number+'</a>';}
          this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.attention'),message:translate('menu.msg.no_del_childs')+numbers}});break;}
      }
    },error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},); //+++
  }
    
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 3000,
    });
  }

  getCompaniesList(){ //+++
    if(this.receivedCompaniesList.length==0)
      this.loadSpravService.getCompaniesList()
        .subscribe(
          (data) => {this.receivedCompaniesList=data as any [];
            this.getSetOfPermissions();
          },
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},
      );
    else this.getSetOfPermissions();
  }  
  getMyId(){ //+++
    if(+this.myId==0)
     this.loadSpravService.getMyId()
        .subscribe(
            (data) => {this.myId=data as any;
              this.getMyCompanyId();},
          error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},
        );
      else this.getMyCompanyId();
  }
  getMyCompanyId(){ //+++
    if(+this.myCompanyId==0)
      this.loadSpravService.getMyCompanyId().subscribe(
      (data) => {
        this.myCompanyId=data as number;
        this.setDefaultCompany();
      }, error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},);
    else this.setDefaultCompany();
  } 

  setDefaultCompany(){
    if(Cookie.get('vatinvoicein_companyId')=='0'||!this.companyIdInList(Cookie.get('vatinvoicein_companyId'))){
      this.sendingQueryForm.companyId=this.myCompanyId;
      Cookie.set('vatinvoicein_companyId',this.sendingQueryForm.companyId);
    }
    this.getCRUD_rights(this.permissionsSet);
  }

  showCheckbox(row:CheckBox):boolean{
    if(!row.is_completed && (
      (this.allowToDeleteAllCompanies)||
      (this.allowToDeleteMyCompany && row.company_id==this.myCompanyId))
      )return true; else return false;
    }

  doFilterCompaniesList(){
    let myCompany:idAndName;
    if(!this.allowToViewAllCompanies){
      this.receivedCompaniesList.forEach(company=>{
      if(this.myCompanyId==company.id) myCompany={id:company.id, name:company.name}});
      this.receivedCompaniesList=[];
      this.receivedCompaniesList.push(myCompany);
    }
  }
  onClickCreateBtn(){
    this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.attention'),message:translate('menu.msg.vio_can_creat')}})
  }
      //*************************************************************   НАСТРОЙКИ   ************************************************************/    
    // открывает диалог настроек
    openDialogSettings() { 
      const dialogSettings = this.settingsVatinvoiceinDialogComponent.open(SettingsVatinvoiceinDialogComponent, {
        maxWidth: '95vw',
        maxHeight: '95vh',
        width: '400px',
        data:
        { //отправляем в диалог:
          receivedCompaniesList: this.receivedCompaniesList, //список предприятий
          company_id: +this.sendingQueryForm.companyId, //предприятие (нужно для поиска покупателя)
          id: 0, //чтобы понять, новый док или уже созданный
        },
      });
      dialogSettings.afterClosed().subscribe(result => {
        if(result){
          //если нажата кнопка Сохранить настройки - вставляем настройки в форму настроек и сохраняем
          if(result.get('companyId')) this.settingsForm.get('companyId').setValue(result.get('companyId').value);
          this.settingsForm.get('statusIdOnComplete').setValue(result.get('statusIdOnComplete').value);
          this.saveSettingsVatinvoicein();
        }
      });
    }
    // Сохраняет настройки
    saveSettingsVatinvoicein(){
      return this.http.post('/api/auth/saveSettingsVatinvoicein', this.settingsForm.value)
      .subscribe(
      (data) => {   
        this.openSnackBar(translate('menu.msg.settngs_saved'), translate('menu.msg.close')); //+++
      },
        error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},
      );
    }
    
    getBaseData(data) {    //+++ emit data to parent component
      this.baseData.emit(data);
    }
  //***********************************************  Ф И Л Ь Т Р   О П Ц И Й   *******************************************/
  
  resetOptions(){
    this.displayingDeletedDocs=false;
    this.fillOptionsList();//перезаполняем список опций
    this.selectionFilterOptions.clear();
    this.sendingQueryForm.filterOptionsIds = [];
  }
  fillOptionsList(){
    this.optionsIds=[{id:1, name: 'menu.top.only_del'},]; //+++
  }
  clickApplyFilters(){
    let showOnlyDeletedCheckboxIsOn:boolean = false; //присутствует ли включенный чекбокс "Показывать только удалённые"
    this.selectionFilterOptions.selected.forEach(z=>{
      if(z.id==1){showOnlyDeletedCheckboxIsOn=true;}
    })
    this.displayingDeletedDocs=showOnlyDeletedCheckboxIsOn;
    this.clearCheckboxSelection();
    this.sendingQueryForm.offset=0;//сброс пагинации
    this.getData();
  }
  updateSortOptions(){//после определения прав пересматриваем опции на случай, если права не разрешают действия с определенными опциями, и исключаем эти опции
    let i=0; 
    this.optionsIds.forEach(z=>{
      console.log("allowToDelete - "+this.allowToDelete);
      if(z.id==1 && !this.allowToDelete){this.optionsIds.splice(i,1)}//исключение опции Показывать удаленные, если нет прав на удаление
      i++;
    });
    if (this.optionsIds.length>0) this.displaySelectOptions=true; else this.displaySelectOptions=false;//если опций нет - не показываем меню опций
  }
  clickFilterOptionsCheckbox(row){
    this.selectionFilterOptions.toggle(row); 
    this.createFilterOptionsCheckedList();
  } 
  createFilterOptionsCheckedList(){//this.sendingQueryForm.filterOptionsIds - массив c id выбранных чекбоксов вида "7,5,1,3,6,2,4", который заполняется при нажатии на чекбокс
    this.sendingQueryForm.filterOptionsIds = [];//                                                     
    this.selectionFilterOptions.selected.forEach(z=>{
      this.sendingQueryForm.filterOptionsIds.push(+z.id);
    });
  }
  // sometimes in cookie "..._companyId" there value that not exists in list of companies. If it happens, company will be not selected and data not loaded until user select company manually
  companyIdInList(id:any):boolean{let r=false;this.receivedCompaniesList.forEach(c=>{if(+id==c.id) r=true});return r}
}
