import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import { QueryForm } from './query-form';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoadSpravService } from '../../../../services/loadsprav';
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { QueryFormService } from './get-withdrawal-table.service';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
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
  selector: 'app-withdrawal',
  templateUrl: './withdrawal.component.html',
  styleUrls: ['./withdrawal.component.css'],
  providers: [QueryFormService,LoadSpravService,Cookie,CommonUtilitesService] //+++
})
export class WithdrawalComponent implements OnInit {
  sendingQueryForm: QueryForm=new QueryForm(); // интерфейс отправляемых данных по формированию таблицы (кол-во строк, страница, поисковая строка, колонка сортировки, asc/desc)
  receivedPagesList: string [] ;//массив для получения данных пагинации
  dataSource = new MatTableDataSource<CheckBox>(); //массив данных для таблицы и чекбоксов (чекбоксы берут из него id, таблица -всё)
  displayedColumns: string[] = [];//массив отображаемых столбцов таблицы
  // selection = new SelectionModel<CheckBox>(true, []);//Class to be used to power selecting one or more options from a list.
  receivedCompaniesList: idAndName [] = [];//массив для получения списка предприятий
  receivedDepartmentsList: idAndName [] = [];//массив для получения списка отделений
  receivedMyDepartmentsList: idAndName [] = [];//массив для получения списка СВОИХ отделений
  myCompanyId:number=0;//
  myId:number=0;
  // checkedList:number[]=[]; //строка для накапливания id чекбоксов вида [2,5,27...]

  //переменные прав
  permissionsSet: any[];//сет прав на документ
  allowToViewAllCompanies:boolean = false;
  allowToViewMyCompany:boolean = false;
  allowToViewMyDepartments:boolean = false;
  allowToViewMyDocs:boolean = false;
  allowToCreateMyCompany:boolean = false;
  allowToCreateAllCompanies:boolean = false;
  allowToCreateMyDepartments:boolean = false;

  allowToView:boolean = false;
  allowToCreate:boolean = false;

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
    private settingsWithdrawalDialogComponent: MatDialog,
    public deleteDialog: MatDialog,
    public dialogRef1: MatDialogRef<WithdrawalComponent>,
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

      if(Cookie.get('withdrawal_companyId')=='undefined' || Cookie.get('withdrawal_companyId')==null)     
        Cookie.set('withdrawal_companyId',this.sendingQueryForm.companyId); else this.sendingQueryForm.companyId=(Cookie.get('withdrawal_companyId')=="0"?"0":+Cookie.get('withdrawal_companyId'));
      if(Cookie.get('withdrawal_departmentId')=='undefined' || Cookie.get('withdrawal_departmentId')==null)  
        Cookie.set('withdrawal_departmentId',this.sendingQueryForm.departmentId); else this.sendingQueryForm.departmentId=(Cookie.get('withdrawal_departmentId')=="0"?"0":+Cookie.get('withdrawal_departmentId'));
      if(Cookie.get('withdrawal_sortAsc')=='undefined' || Cookie.get('withdrawal_sortAsc')==null)       
        Cookie.set('withdrawal_sortAsc',this.sendingQueryForm.sortAsc); else this.sendingQueryForm.sortAsc=Cookie.get('withdrawal_sortAsc');
      if(Cookie.get('withdrawal_sortColumn')=='undefined' || Cookie.get('withdrawal_sortColumn')==null)    
        Cookie.set('withdrawal_sortColumn',this.sendingQueryForm.sortColumn); else this.sendingQueryForm.sortColumn=Cookie.get('withdrawal_sortColumn');
      if(Cookie.get('withdrawal_offset')=='undefined' || Cookie.get('withdrawal_offset')==null)        
        Cookie.set('withdrawal_offset',this.sendingQueryForm.offset); else this.sendingQueryForm.offset=Cookie.get('withdrawal_offset');
      if(Cookie.get('withdrawal_result')=='undefined' || Cookie.get('withdrawal_result')==null)        
        Cookie.set('withdrawal_result',this.sendingQueryForm.result); else this.sendingQueryForm.result=Cookie.get('withdrawal_result');
    
      //+++ getting base data from parent component
      this.getBaseData('myId');    
      this.getBaseData('myCompanyId');  
      this.getBaseData('companiesList');      
      this.getBaseData('myDepartmentsList');
    
      this.fillOptionsList();//заполняем список опций фильтра
     
      this.getCompaniesList();
    }

    // -------------------------------------- *** ПРАВА *** ------------------------------------
   getSetOfPermissions(){
    return this.http.get('/api/auth/getMyPermissions?id=45')
    .subscribe(
        (data) => {   
                    this.permissionsSet=data as any [];
                    this.getMyId();
                },
      error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},
      );
    }

  getCRUD_rights(permissionsSet:any[]){
    this.allowToCreateAllCompanies = permissionsSet.some(         function(e){return(e==568)});
    this.allowToCreateMyCompany = permissionsSet.some(            function(e){return(e==569)});
    this.allowToCreateMyDepartments = permissionsSet.some(        function(e){return(e==570)});
    this.allowToViewAllCompanies = permissionsSet.some(           function(e){return(e==571)});
    this.allowToViewMyCompany = permissionsSet.some(              function(e){return(e==572)});
    this.allowToViewMyDepartments = permissionsSet.some(          function(e){return(e==573)});
    this.allowToViewMyDocs = permissionsSet.some(                 function(e){return(e==574)});
    this.getData();
  }

  refreshPermissions():boolean{
    this.allowToView=(this.allowToViewAllCompanies||this.allowToViewMyCompany||this.allowToViewMyDepartments||this.allowToViewMyDocs)?true:false;
    this.allowToCreate=(this.allowToCreateAllCompanies||this.allowToCreateMyCompany||this.allowToCreateMyDepartments)?true:false;
    this.showOpenDocIcon=(this.allowToView);
    
    console.log("allowToView - "+this.allowToView);
    console.log("allowToCreate - "+this.allowToCreate);
    return true;
  }
// -------------------------------------- *** КОНЕЦ ПРАВ *** ------------------------------------

  getData(){
    if(this.refreshPermissions() && this.allowToView)
    {
      console.log('department 1 = '+this.sendingQueryForm.departmentId);
      this.doFilterCompaniesList(); //если нет просмотра по всем предприятиям - фильтруем список предприятий до своего предприятия
      this.doFilterDepartmentsList();//если нет просмотра по свому предприятию - фильтруем список отделений предприятия до своих отделений
      this.getTableHeaderTitles();
      this.getPagesList();
      this.getTable();
    } else {this.gettingTableData=false;this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:translate('menu.msg.ne_perm')}})} //+++
  }

  getTableHeaderTitles(){
    this.displayedColumns=[];
    // if(this.allowToDelete) this.displayedColumns.push('select');
    if(this.showOpenDocIcon) this.displayedColumns.push('opendoc');
    this.displayedColumns.push('doc_number');
    //this.displayedColumns.push('company');
    this.displayedColumns.push('department');
    this.displayedColumns.push('creator');
    this.displayedColumns.push('kassa');
    this.displayedColumns.push('summ');
    this.displayedColumns.push('description');
    this.displayedColumns.push('date_time_created');
  }

  getPagesList(){
    // this.receivedPagesList=null;
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

  // isAllSelected() {//все выбраны
  //   const numSelected = this.selection.selected.length;
  //   const numRows = this.dataSource.data.length;
  //   return  numSelected === numRows;//true если все строки выбраны
  // }  

  // isThereSelected() {//есть выбранные
  //   return this.selection.selected.length>0;
  // }  

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  // masterToggle() {
  //   this.isThereSelected() ?
  //   this.resetSelecion() :
  //       this.dataSource.data.forEach(row => {
  //         // if(!row.is_completed){this.selection.select(row);}
  //         if(this.showCheckbox(row)){this.selection.select(row);}//если чекбокс отображаем, значит можно удалять этот документ
  //       });
  //       this.createCheckedList();
  //   this.isAllSelected();
  //   this.isThereSelected();
  // }

  // resetSelecion(){
  //   this.selection.clear(); 
  // }

  // clickTableCheckbox(row){
  //   this.selection.toggle(row); 
  //   this.createCheckedList();
  //   this.isAllSelected();
  //   this.isThereSelected();
  // }

  // createCheckedList(){
  //   this.checkedList = [];
  //   console.log("1");
  //   for (var i = 0; i < this.dataSource.data.length; i++) {
  //     console.log("2");
  //     if(this.selection.isSelected(this.dataSource.data[i]))
  //     this.checkedList.push(this.dataSource.data[i].id);
  //   }
  //   if(this.checkedList.length>0){
  //     console.log("3");
  //       this.hideAllBtns();
  //       if(this.allowToDelete) this.visBtnDelete = true;
  //       if(this.checkedList.length==1){this.visBtnCopy = true}
  //   }else{console.log("4");this.showOnlyVisBtnAdd()}
  //   console.log("checkedList - "+this.checkedList);
  // }

  setNumOfPages(){
    // this.clearCheckboxSelection();
    // this.createCheckedList();
    this.sendingQueryForm.offset=0;
    Cookie.set('withdrawal_result',this.sendingQueryForm.result);
    this.getData();
  }

  setPage(value:any) // set pagination
  {
    // this.clearCheckboxSelection();
    this.sendingQueryForm.offset=value;
    Cookie.set('withdrawal_offset',value);
    this.getData();
  }

  // clearCheckboxSelection(){
  //   this.selection.clear();
  //   this.dataSource.data.forEach(row => this.selection.deselect(row));
  // }

  setSort(valueSortColumn:any) // set sorting column
  {
      // this.clearCheckboxSelection();
      if(valueSortColumn==this.sendingQueryForm.sortColumn){// если колонка, на которую ткнули, та же, по которой уже сейчас идет сортировка
          if(this.sendingQueryForm.sortAsc=="asc"){
              this.sendingQueryForm.sortAsc="desc"
          } else {  
              this.sendingQueryForm.sortAsc="asc"
          }
      Cookie.set('withdrawal_sortAsc',this.sendingQueryForm.sortAsc);
      } else {
          this.sendingQueryForm.sortColumn=valueSortColumn;
          this.sendingQueryForm.sortAsc="asc";
          Cookie.set('withdrawal_sortAsc',"asc");
          Cookie.set('withdrawal_sortColumn',valueSortColumn);
      }
      this.getData();
  }

  onCompanySelection(){
    Cookie.set('withdrawal_companyId',this.sendingQueryForm.companyId);
    Cookie.set('withdrawal_departmentId','0');
    // console.log('withdrawal_companyId - '+Cookie.get('withdrawal_companyId'));
    // console.log('withdrawal_departmentId - '+Cookie.get('withdrawal_departmentId'));
    this.sendingQueryForm.departmentId="0"; 
    this.resetOptions();
    this.getDepartmentsList();
  }
  onDepartmentSelection(){
    Cookie.set('withdrawal_departmentId',this.sendingQueryForm.departmentId);
    // console.log('withdrawal_companyId - '+Cookie.get('withdrawal_companyId'));
    // console.log('withdrawal_departmentId - '+Cookie.get('withdrawal_departmentId'));
    this.resetOptions();
    this.getData();
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
  getMyDepartmentsList(){ //+++
    if(this.receivedMyDepartmentsList.length==0)
      this.loadSpravService.getMyDepartmentsListByCompanyId(this.myCompanyId,false)
      .subscribe(
          (data) => {this.receivedMyDepartmentsList=data as any [];
            this.setDefaultDepartment();},
            error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('menu.msg.error'),message:error.error}})},
      );
      else this.setDefaultDepartment();
  }

  setDefaultCompany(){
    if(Cookie.get('withdrawal_companyId')=='0'||!this.companyIdInList(Cookie.get('withdrawal_companyId'))){
      this.sendingQueryForm.companyId=this.myCompanyId;
      Cookie.set('withdrawal_companyId',this.sendingQueryForm.companyId);
    }
      this.getDepartmentsList();
  }

  getDepartmentsList(){
    this.receivedDepartmentsList=null;
    this.loadSpravService.getDepartmentsListByCompanyId(+this.sendingQueryForm.companyId,false)
            .subscribe(
                (data) => {this.receivedDepartmentsList=data as any [];
                            this.getMyDepartmentsList();},
                error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})}
            );
  }

  setDefaultDepartment(){
    if(this.receivedDepartmentsList.length==1)
    {
      this.sendingQueryForm.departmentId=+this.receivedDepartmentsList[0].id;
      Cookie.set('withdrawal_departmentId',this.sendingQueryForm.departmentId);
    }
    this.getCRUD_rights(this.permissionsSet);
  }

  inMyDepthsId(id:number):boolean{//проверяет, состоит ли присланный id в группе id отделений пользователя
    let inMyDepthsId:boolean = false;
    this.receivedMyDepartmentsList.forEach(myDepth =>{
      myDepth.id==id?inMyDepthsId=true:null;
    });
  return inMyDepthsId;
  }

  // showCheckbox(row:CheckBox):boolean{
  //   if(!row.is_completed && (
  //     (this.allowToDeleteAllCompanies)||
  //     (this.allowToDeleteMyCompany && row.company_id==this.myCompanyId)||
  //     (this.allowToDeleteMyDepartments && row.company_id==this.myCompanyId && this.inMyDepthsId(row.department_id))||
  //     (this.allowToDeleteMyDocs && row.company_id==this.myCompanyId && this.inMyDepthsId(row.department_id) && row.creator_id==this.myId))
  //     )return true; else return false;
  //   }

  doFilterCompaniesList(){
    let myCompany:idAndName;
    if(!this.allowToViewAllCompanies){
      this.receivedCompaniesList.forEach(company=>{
      if(this.myCompanyId==company.id) myCompany={id:company.id, name:company.name}});
      this.receivedCompaniesList=[];
      this.receivedCompaniesList.push(myCompany);
    }
  }

  doFilterDepartmentsList(){
    if( (!this.allowToViewAllCompanies && !this.allowToViewMyCompany && this.allowToViewMyDepartments)||
        (!this.allowToViewAllCompanies && !this.allowToViewMyCompany && !this.allowToViewMyDepartments && this.allowToViewMyDocs)){
      this.receivedDepartmentsList=this.receivedMyDepartmentsList;}
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
    // this.optionsIds=[{id:1, name: 'menu.top.only_del'},]; //+++
  }
  // sometimes in cookie "..._companyId" there value that not exists in list of companies. If it happens, company will be not selected and data not loaded until user select company manually
  companyIdInList(id:any):boolean{let r=false;this.receivedCompaniesList.forEach(c=>{if(+id==c.id) r=true});return r}
  // clickApplyFilters(){
  //   let showOnlyDeletedCheckboxIsOn:boolean = false; //присутствует ли включенный чекбокс "Показывать только удалённые"
  //   this.selectionFilterOptions.selected.forEach(z=>{
  //     if(z.id==1){showOnlyDeletedCheckboxIsOn=true;}
  //   })
  //   this.displayingDeletedDocs=showOnlyDeletedCheckboxIsOn;
  //   // this.clearCheckboxSelection();
  //   this.sendingQueryForm.offset=0;//сброс пагинации
  //   this.getData();
  // }
  // updateSortOptions(){//после определения прав пересматриваем опции на случай, если права не разрешают действия с определенными опциями, и исключаем эти опции
  //   let i=0; 
  //   this.optionsIds.forEach(z=>{
  //     if(z.id==1 && !this.allowToDelete){this.optionsIds.splice(i,1)}//исключение опции Показывать удаленные, если нет прав на удаление
  //     i++;
  //   });
  //   if (this.optionsIds.length>0) this.displaySelectOptions=true; else this.displaySelectOptions=false;//если опций нет - не показываем меню опций
  // }
  // clickFilterOptionsCheckbox(row){
  //   this.selectionFilterOptions.toggle(row); 
  //   this.createFilterOptionsCheckedList();
  // } 
  // createFilterOptionsCheckedList(){//this.sendingQueryForm.filterOptionsIds - массив c id выбранных чекбоксов вида "7,5,1,3,6,2,4", который заполняется при нажатии на чекбокс
  //   this.sendingQueryForm.filterOptionsIds = [];//                                                     
  //   this.selectionFilterOptions.selected.forEach(z=>{
  //     this.sendingQueryForm.filterOptionsIds.push(+z.id);
  //   });
  // }
}
