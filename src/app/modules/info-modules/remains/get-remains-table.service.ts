// Сервис для работы с таблицей предприятий (получение данных, пагинации, сортировка, поиск...)

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {QueryForm} from './query-form';
  
@Injectable()
export class QueryFormService{
  
    constructor(private http: HttpClient){ }

//Здесь определен метод getTable, который получает для отправки объект QueryForm. 
//Сами отправляемые данные представляют объект body. 
//Для отправки применяется метод http.post(), в который передается адрес сервера и отправляемый объект.      
getTable(queryForm: QueryForm){
        const body = {  searchString: queryForm.searchString, 
                        sortColumn:queryForm.sortColumn, 
                        offset:queryForm.offset, 
                        sortAsc:queryForm.sortAsc, 
                        result:queryForm.result,
                        companyId: queryForm.companyId,
                        departmentId:queryForm.departmentId,
                        departmentsIdsList:queryForm.departmentsIdsList,
                        cagentId:queryForm.cagentId,
                        categoryId: queryForm.selectedNodeId,
                        filterOptionsIds: queryForm.filterOptionsIds,
                      };
                        // console.log("перед вызовом getProductsTable");
        return this.http.post('/api/auth/getProductRemainsTable', body); 
    }

// getPagesList(queryForm: QueryForm){
//           const body = {  searchString: queryForm.searchString, 
//                           sortColumn:queryForm.sortColumn, 
//                           offset:queryForm.offset, 
//                           sortAsc:queryForm.sortAsc, 
//                           result:queryForm.result,
//                           companyId: queryForm.companyId,
//                           departmentId:queryForm.departmentId,
//                           departmentsIdsList:queryForm.departmentsIdsList,
//                           cagentId:queryForm.cagentId,
//                           categoryId: queryForm.selectedNodeId};
                   
//             return this.http.post('/api/auth/getProductRemainsPagesList', body); 
//         }


}



