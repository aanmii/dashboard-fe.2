import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { WorkItem } from './work-item.model';

@Injectable({
  providedIn: 'root'
})
export class AzureDevOpsService {

  private apiUrl = 'https://localhost:44389/api/AzureDevOps';

  constructor(private http: HttpClient) { }

  // Metoda za dohvat svih work item-a
  getWorkItems(): Observable<WorkItem[]> {
    return this.http.get<WorkItem[]>(`${this.apiUrl}/GetWorkItems`).pipe(
      map((response: any[]) => {
        console.log('Fetched work items:', response);
        return response.map((data) => new WorkItem(data));
      })
    );
  }

  getWorkItemById(id: number): Observable<WorkItem> {
    return this.http.get<WorkItem>(`${this.apiUrl}/${id}`); // Podesi URL prema ASP.NET ruti
  }
  
  
}
