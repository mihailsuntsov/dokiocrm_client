// Сервис для работы с таблицей документов (получение данных, пагинации, сортировка, поиск...)

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {QueryForm} from './query-form';

@Injectable()
export class QueryFormService{

      constructor(private http: HttpClient){ }

  getTable(queryForm: QueryForm){
          const body = {searchString: queryForm.searchString, 
                        sortColumn:queryForm.sortColumn, 
                        offset:queryForm.offset, 
                        sortAsc:queryForm.sortAsc, 
                        result:queryForm.result,
                        companyId: queryForm.companyId,
                        departmentFromId: queryForm.departmentFromId,
                        departmentToId: queryForm.departmentToId,
                        filterOptionsIds: queryForm.filterOptionsIds};
    return this.http.post('/api/auth/getMovingTable', body); 
  }

  getPagesList(queryForm: QueryForm){
          const body = {searchString: queryForm.searchString, 
                        sortColumn:queryForm.sortColumn, 
                        offset:queryForm.offset, 
                        sortAsc:queryForm.sortAsc, 
                        result:queryForm.result,
                        companyId: queryForm.companyId,
                        departmentFromId: queryForm.departmentFromId,
                        departmentToId: queryForm.departmentToId,
                        filterOptionsIds: queryForm.filterOptionsIds
                    };
    return this.http.post('/api/auth/getMovingPagesList', body); 
  }


}