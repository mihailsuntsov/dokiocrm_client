import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageDialog } from 'src/app/ui/dialogs/messagedialog.component';
import { MatDialog } from '@angular/material/dialog';
import { CommonUtilitesService } from 'src/app/services/common_utilites.serviсe';
import { translate } from '@ngneat/transloco'; //+++
import { MutualpaymentDetComponent } from 'src/app/modules/info-modules/mutualpayment_det/mutualpayment_det.component';

@Component({
  selector: 'app-balance-cagent',
  templateUrl: './balance-cagent.component.html',
  styleUrls: ['./balance-cagent.component.css'],
  providers: [CommonUtilitesService]
})
export class BalanceCagentComponent implements OnInit, OnChanges {

  balanceLoading: boolean=false; // идет загрузка баланса
  cagentBalance:number=null;
  showModule=true;

  @Input() company_id:    number;
  @Input() cagent_id:     number;
  @Input() currency:      string;
  @Input() cagent:        string;
  @Output() successfullGetCagentBalance = new EventEmitter<any>(); //событие успешного получения баланса

  constructor(
    private http: HttpClient,
    public MessageDialog: MatDialog,
    public mutualpaymentDetDialog: MatDialog,
    public commonUtilites: CommonUtilitesService,) { }

  ngOnInit(): void {
  }
  ngOnChanges(changes: SimpleChanges): void {
    if(changes.cagent_id) {
      this.getBalance();
    }
  }

  //возвращает баланс по кассе, р.счёту или контрагенту
  getBalance(){
    if(this.company_id!=null && this.cagent_id!=null){
      this.balanceLoading=true;
      this.cagentBalance=null;
      this.http.get('/api/auth/getCagentBalance?companyId='+this.company_id+'&typeId='+this.cagent_id) 
      .subscribe(
          (data) => 
          {  
            if(data!=null){
              this.balanceLoading=false;
              this.cagentBalance=parseFloat(data.toString()); 
              this.successfullGetCagentBalance.emit();
              // this.refresh();
            } else {
              this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:translate('docs.msg.blnc_quer_err')}})
            }
          },
          error => {this.balanceLoading=false;this.MessageDialog.open(MessageDialog,{width:'400px',data:{head:translate('docs.msg.error'),message:error.error}})},
      );
    } else this.cagentBalance=null;
  }
    
  refresh(){
    this.showModule=false;
    // alert(this.showModule)
    setTimeout(() => {this.showModule=true; }, 1000);
  }

  openDetailsWindow() {
    this.mutualpaymentDetDialog.open(MutualpaymentDetComponent, {
      maxWidth: '95vw',
      maxHeight: '95vh',
      height: '95%',
      width: '95%',
      data:
      { 
        mode: 'viewInWindow',
        cagentId: this.cagent_id,
        companyId: this.company_id,
        dateFrom:null,
        dateTo:null,
        cagent:this.cagent,
        locale:null,
      },
    });
  } 


}
