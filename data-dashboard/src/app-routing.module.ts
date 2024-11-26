import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkItemTreeComponent } from './app/work-item-tree/work-item-tree.component';

const routes: Routes = [
  { path: '', component: WorkItemTreeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],  
  exports: [RouterModule] 
})
export class AppRoutingModule { }
