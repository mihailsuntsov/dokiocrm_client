import { Component, OnInit } from '@angular/core';
import { QueryForm } from './query-form';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { DeleteDialog } from 'src/app/ui/dialogs/deletedialog.component';
import { LoadSpravService } from './loadsprav';
import { QueryFormService } from './get-traderesults-table.service';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { MatDialog } from '@angular/material/dialog';
import { translate } from '@ngneat/transloco'; //+++

export interface DocTable {
  id: number;
}
export interface NumRow {//интерфейс для списка количества строк
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-traderesults',
  templateUrl: './traderesults.component.html',
  styleUrls: ['./traderesults.component.css'],
  providers: [QueryFormService,LoadSpravService]
})
export class TraderesultsComponent implements OnInit {
  sendingQueryForm: QueryForm=new QueryForm(); // интерфейс отправляемых данных по формированию таблицы (кол-во строк, страница, поисковая строка, колонка сортировки, asc/desc)
  donePagesList: boolean = false;
  receivedPagesList: string [];//массив для получения данных пагинации
  receivedMatTable: DocTable [] = [];//массив для получения данных для материал таблицы
  dataSource = new MatTableDataSource<DocTable>(this.receivedMatTable); //источник данных для материал таблицы
  displayedColumns: string[]=[];//массив отображаемых столбцов таблицы
  selection = new SelectionModel<DocTable>(true, []);//Class to be used to power selecting one or more options from a list.
  receivedCompaniesList: any [] = [];//массив для получения списка предприятий
  receivedDepartmentsList: any [];//массив для получения списка предприятий

 
  //переменные прав
  permissionsSet: any[];//сет прав на документ

  allowToUpdateAllCompanies:boolean = false;
  allowToUpdateMyCompany:boolean = false;
  allowToUpdateMyDepartments:boolean = false;
  allowToUpdateMy:boolean = false;
  allowToViewAllCompanies:boolean = false;
  allowToViewMyCompany:boolean = false;
  allowToViewMyDepartments:boolean = false;
  allowToViewMy:boolean = false;
  allowToCreate:boolean = false;
  allowToDelete:boolean = false;
  showOpenDocIcon:boolean=false;

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

  //Управление чекбоксами
  checkedList:any; //строка для накапливания id вида [2,5,27...]

  constructor(private queryFormService:   QueryFormService,
    private httpService:   LoadSpravService,
    private http: HttpClient,
    public MessageDialog: MatDialog,
    public deleteDialog: MatDialog) { }
      
    ngOnInit() {
      this.sendingQueryForm.sortAsc="desc";
      this.sendingQueryForm.sortColumn="trade_date";
      this.sendingQueryForm.offset=0;
      this.sendingQueryForm.result="5";
      this.sendingQueryForm.companyId="0";
      this.sendingQueryForm.departmentId="0";
      this.getCompaniesList();
      this.getSetOfPermissions();
    }

    getData(){
      this.getDepartmentsList();
    }
// -------------------------------------- *** ПРАВА *** ------------------------------------
getSetOfPermissions(){
  return this.http.get('/api/auth/getMyPermissions?id=7')
          .subscribe(
              (data) => {   
                          this.permissionsSet=data as any [];
                          console.log("permissions:"+this.permissionsSet);
                          this.getCRUD_rights(this.permissionsSet);
                      },
              error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
          );
}
getCRUD_rights(permissionsSet:any[]){
  this.allowToCreate = permissionsSet.some(this.isAllowToCreate);//some проверяет, удовлетворяет ли хоть какой-нибудь элемент массива условию, заданному в передаваемой функции
  this.allowToDelete = permissionsSet.some(this.isAllowToDelete);
  this.allowToViewAllCompanies = permissionsSet.some(this.isAllowToViewAllCompanies);
  this.allowToViewMyCompany = permissionsSet.some(this.isAllowToViewMyCompany);
  this.allowToViewMyDepartments = permissionsSet.some(this.isAllowToViewMyDepartments);
  this.allowToViewMy = permissionsSet.some(this.isAllowToViewMy);
  this.allowToUpdateAllCompanies = permissionsSet.some(this.isAllowToUpdateAllCompanies);
  this.allowToUpdateMyCompany = permissionsSet.some(this.isAllowToUpdateMyCompany);
  this.allowToUpdateMyDepartments = permissionsSet.some(this.isAllowToUpdateMyDepartments);
  this.allowToUpdateMy = permissionsSet.some(this.isAllowToUpdateMy);
  this.showOpenDocIcon=(this.allowToUpdateAllCompanies||this.allowToUpdateMyCompany||this.allowToUpdateMyDepartments||this.allowToUpdateMy||this.allowToViewAllCompanies||this.allowToViewMyCompany||this.allowToViewMyDepartments||this.allowToViewMy);
  this.visBtnAdd=this.allowToCreate;
  this.getTableHeaderTitles();
  this.getData();
}
isAllowToCreate   (e){return(e==75);}           
isAllowToDelete   (e){return(e==76);}
isAllowToViewAllCompanies(e){return(e==77);}      //просмотр доков всех доступных предприятий
isAllowToViewMyCompany(e){return(e==78);}         //просмотр доков моего предприятия
isAllowToViewMyDepartments(e){return(e==79);}     //просмотр доков моих отделений
isAllowToViewMy (e){return(e==80);}               //просмотр моих доков
isAllowToUpdateAllCompanies(e){return(e==81);}    //редактирование доков всех доступных предприятий
isAllowToUpdateMyCompany(e){return(e==82);}       //редактирование доков моего предприятия
isAllowToUpdateMyDepartments(e){return(e==83);}   //редактирование доков моих отделений
isAllowToUpdateMy (e){return(e==84);}             //редактирование моих доков


getTableHeaderTitles(){
  if(this.allowToDelete) this.displayedColumns.push('select');
  if(this.showOpenDocIcon) this.displayedColumns.push('opendoc');
  //this.displayedColumns.push('id');
  this.displayedColumns.push('trade_date_char');
  this.displayedColumns.push('department');
  this.displayedColumns.push('employee');
  this.displayedColumns.push('creator');
  this.displayedColumns.push('date_time_created');
}
// -------------------------------------- *** КОНЕЦ ПРАВ *** ------------------------------------
    getPagesList(sendingQueryForm: QueryForm){
      this.donePagesList = false;
      // this.receivedPagesList=null;
      this.queryFormService.getPagesList(sendingQueryForm)
              .subscribe(
                  data => {this.receivedPagesList=data as string []; this.donePagesList=true;
                  this.size=this.receivedPagesList[0];
                  this.pagenum=this.receivedPagesList[1];
                  this.listsize=this.receivedPagesList[2];
                  this.maxpage=(this.receivedPagesList[this.receivedPagesList.length-1])},
                  error => console.log(error)
              ); 
    }

    getTable(sendingQueryForm: QueryForm){
      this.queryFormService.getTable(sendingQueryForm)
              .subscribe(
                  (data) => {
                    this.receivedMatTable=data as any []; 
                    this.dataSource.data = this.receivedMatTable;
                  },
                  error => console.log(error) 
              );
    }

    isAllSelected() {
      const numSelected = this.selection.selected.length;
      const numRows = this.dataSource.data.length;
      return numSelected === numRows;//true если все строки выбраны
    }  
    
    /** Selects all rows if they are not all selected; otherwise clear selection. */
    masterToggle() {
      this.isAllSelected() ?
          this.selection.clear() :
          this.dataSource.data.forEach(row => this.selection.select(row));
          this.createCheckedList();
    }
   
    /** The label for the checkbox on the passed row */
    checkboxLabel(row?: DocTable): string {
      if (!row) {
        return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
      }
      return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
    }

    clickTableCheckbox(row){
      this.selection.toggle(row); 
      this.createCheckedList();
    }

    createCheckedList(){
      this.checkedList = [];
  
      for (var i = 0; i < this.receivedMatTable.length; i++) {
        if(this.selection.isSelected(this.receivedMatTable[i]))
          this.checkedList.push(this.receivedMatTable[i].id);
      }
      this.checkedList = JSON.stringify(this.checkedList);
      if(this.checkedList.length>2){
          this.hideAllBtns();
          if(this.allowToDelete) this.visBtnDelete = true;
      }else{this.showOnlyVisBtnAdd()}
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
      this.getData();
    }
    
    setPage(value:any) // set pagination
    {
      this.clearCheckboxSelection();
      this.sendingQueryForm.offset=value;
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
        } else {
            this.sendingQueryForm.sortColumn=valueSortColumn;
            this.sendingQueryForm.sortAsc="asc";
        }
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

    deleteDocs(){
      const body = {"checked": this.checkedList};
      this.clearCheckboxSelection();
        return this.http.post('/api/auth/deleteTradeResults', body) 
              .subscribe(
                  (data) => {   
                              this.receivedMatTable=data as any []; 
                              this.dataSource.data = this.receivedMatTable;
                              this.getData();
                          },
                  error => {console.log(error);this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}});},
              );
      }

    getCompaniesList(){
      this.receivedCompaniesList=null;
      this.httpService.getCompaniesList()
              .subscribe(
                  (data) => {this.receivedCompaniesList=data as any [];
                    /*console.log("receivedCompaniesList-"+this.receivedCompaniesList)*/
                    this.getDepartmentsList();
                  },
                  error => console.log(error)
              );
    }

    getDepartmentsList(){
      this.receivedDepartmentsList=null;
      this.httpService.getDepartmentsListByCompanyId(this.sendingQueryForm.companyId,false)
              .subscribe(
                  (data) => {this.receivedDepartmentsList=data as any [];
                    this.getPagesList(this.sendingQueryForm);
                    this.getTable(this.sendingQueryForm);
                    console.log("receivedDepartmentsList-"+this.receivedDepartmentsList)},
                  error => console.log(error)
              );
    }



  
}