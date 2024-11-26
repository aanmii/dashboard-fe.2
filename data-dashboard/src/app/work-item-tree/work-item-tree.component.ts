import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AzureDevOpsService } from '../azure-devops.service';
import { WorkItem } from '../work-item.model';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-work-item-tree',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './work-item-tree.component.html',
  styleUrls: ['./work-item-tree.component.css'],
  providers: [AzureDevOpsService],
})
export class WorkItemTreeComponent implements OnInit {
  workItems: WorkItem[] = [];
  filteredWorkItems: WorkItem[] = [];
  expandedItems: Map<string, boolean> = new Map();
  expandedFirstLevelItemId: number | null = null;

  workItemTypeOptions: string[] = [];
  stateOptions: string[] = [];

  filters = {
    title: '',
    assignedTo: '',
    state: {} as { [key: string]: boolean },
    createdDate: '',
    type: {} as { [key: string]: boolean },
  };

  displayedWorkItems: Set<number> = new Set();

  isFilterModalOpen = false;
  activeFilter: string | null = null;

  constructor(private workItemService: AzureDevOpsService) {}

  ngOnInit() {
    this.loadWorkItems();
  }

  loadWorkItems() {
    this.workItemService.getWorkItems().subscribe(
      (items) => {
        this.workItems = this.processWorkItems(items);
        this.filteredWorkItems = [...this.workItems];

        this.generateStateOptions();
        this.generateTypeOptions();
        this.resetFilters();
      },
      (error) => {
        console.error('Error fetching work items:', error);
      }
    );
  }

  private processWorkItems(items: WorkItem[]): WorkItem[] {
    const itemMap = new Map<number, WorkItem>();
    const linkRequests: Observable<WorkItem>[] = [];
  
    // Popunjavamo mapu sa WorkItem objektima, gde je ključ ID work itema
    items.forEach((item) => itemMap.set(item.id, item));
  
    // Pretražujemo links i generišemo pozive za asinhrono preuzimanje povezanih stavki
    items.forEach((item) => {
      if (item.links && item.links.length > 0) {
        item.links.forEach((linkId) => {
          if (!itemMap.has(linkId)) {
            linkRequests.push(this.workItemService.getWorkItemById(linkId));
          }
        });
      }
    });
  

    if (linkRequests.length > 0) {
      forkJoin(linkRequests).subscribe((linkedItems) => {
        linkedItems.forEach((linkedItem: WorkItem) => {
          itemMap.set(linkedItem.id, linkedItem); 
        });
  

        this.workItems = [...itemMap.values()];
        this.filteredWorkItems = [...this.workItems];
      });
    } else {

      this.filteredWorkItems = [...items];
    }
  
    return items;
  }
  

  generateStateOptions() {
    this.stateOptions = Array.from(new Set(this.workItems.map((item) => item.state))).filter(Boolean);
  }

  generateTypeOptions() {
    this.workItemTypeOptions = Array.from(new Set(this.workItems.map((item) => item.workItemType))).filter(Boolean);
  }

  toggleFilter(filterType: string) {
    this.activeFilter = filterType;
    this.isFilterModalOpen = true;
  }

  closeFilterModal() {
    this.isFilterModalOpen = false;
  }

  applyFilters() {
    this.filteredWorkItems = this.workItems.filter((item) => {
      const matchesTitle = this.filters.title ? item.title.toLowerCase().includes(this.filters.title.toLowerCase()) : true;
      const matchesAssignedTo = this.filters.assignedTo ? item.assignedTo.toLowerCase().includes(this.filters.assignedTo.toLowerCase()) : true;
      const matchesState =
        this.filters.state[item.state as keyof typeof this.filters.state] ||
        Object.values(this.filters.state).every((val) => !val);
      const matchesType =
        this.filters.type[item.workItemType as keyof typeof this.filters.type] ||
        Object.values(this.filters.type).every((val) => !val);
      const filterDate = this.filters.createdDate ? new Date(this.filters.createdDate) : null;
      const matchesCreatedDate = this.filters.createdDate
        ? item.createdDate
          ? new Date(item.createdDate).toISOString().split('T')[0] === filterDate?.toISOString().split('T')[0]
          : false
        : true;

      return matchesTitle && matchesAssignedTo && matchesState && matchesType && matchesCreatedDate;
    });
    this.currentPage = 1;
    this.closeFilterModal();
  }

  resetFilters() {
    this.filters = {
      title: '',
      assignedTo: '',
      state: this.stateOptions.reduce((acc, state) => {
        acc[state] = false;
        return acc;
      }, {} as { [key: string]: boolean }),
      createdDate: '',
      type: this.workItemTypeOptions.reduce((acc, type) => {
        acc[type] = false;
        return acc;
      }, {} as { [key: string]: boolean }),
    };
    this.filteredWorkItems = [...this.workItems];
  }

  isWorkItemAlreadyDisplayed(workItem: WorkItem): boolean {
    return this.displayedWorkItems.has(workItem.id);
  }

  private getExpandedKey(workItem: WorkItem, parentId: number | null): string {
    return `${parentId || 'root'}_${workItem.id}`;
  }
  

  isExpanded(workItem: WorkItem, parentId: number | null): boolean {
    const key = this.getExpandedKey(workItem, parentId);
    return this.expandedItems.get(key) || false;
  }
  
  
  toggleExpand(workItem: WorkItem, parentId: number | null) {
    const key = this.getExpandedKey(workItem, parentId);
    const isCurrentlyExpanded = this.isExpanded(workItem, parentId);
  
    // Zatvori sve expanded stavke na istom nivou
    this.closePreviousExpandedItemOnSameLevel(parentId);
  
    if (isCurrentlyExpanded) {
      this.expandedItems.delete(key);
    } else {
      this.expandedItems.set(key, true);
  
      // Učitavanje child stavki ako još nisu učitane
      const linkRequests = workItem.links.map((linkId) => this.workItemService.getWorkItemById(linkId));
      forkJoin(linkRequests).subscribe(
        (linkedItems: WorkItem[]) => {
          linkedItems.forEach((linkedItem) => {
            if (!this.workItems.some((item) => item.id === linkedItem.id)) {
              this.workItems.push(linkedItem);
            }
          });
          this.filteredWorkItems = [...this.workItems]; 
        },
        (error) => {
          console.error('Error loading linked WorkItems:', error);
        }
      );
    }
  }
  
  private closePreviousExpandedItemOnSameLevel(parentId: number | null) {
    this.expandedItems.forEach((isExpanded, key) => {
      if (isExpanded) {
        const [currentParentId, workItemId] = key.split('_');
        if (currentParentId === (parentId ? parentId.toString() : 'root')) {
          this.expandedItems.delete(key);
        }
      }
    });
  }
  
  
hasChildren(workItem: WorkItem, level: number): boolean {
  return (workItem.links && workItem.links.length > 0);
}

getWorkItemById(id: number): WorkItem | undefined {
  return this.workItems.find(item => item.id === id);
}

isAlreadyLinked(workItem: WorkItem): boolean {
    return this.workItems.some((item) => item.links && item.links.some((linkId) => linkId === workItem.id));
}

  stateColors: { [key: string]: string } = {
    New: '#007bff', // Plava
    Closed: '#6c757d', // Siva
    Active: '#28a745', // Zelena
    Resolved: '#17a2b8', // Svetlo plava
    'In Development': '#ffc107', // Žuta
    'In Preparation': '#fd7e14', // Narandžasta
    'Development Completed': '#20c997', // Tirkizna
    Removed: '#dc3545', // Crvena
    Design: '#6610f2', // Ljubičasta
    'In Progress': '#ff851b', // Tamna narandžasta
    Inactive: '#343a40', // Tamno siva
  };

  getStateColor(state: string): string {
    if (!this.stateColors[state]) {
      this.stateColors[state] = this.generateRandomColor();
    }
    return this.stateColors[state];
  }

  generateRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }

currentPage: number = 1; // Trenutna stranica
itemsPerPage: number = 100; // Broj stavki po stranici
totalItems: number = 0; // Ukupan broj stavki


get totalPages(): number {
  return Math.ceil(this.filteredWorkItems.length / this.itemsPerPage);
}


get paginatedWorkItems(): WorkItem[] {
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = startIndex + this.itemsPerPage;
  return this.filteredWorkItems.slice(startIndex, endIndex);
}


goToPage(page: number) {
  if (page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
  }
}

nextPage() {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}

previousPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
  }
}


inputPageNumber: number | null = null;


isValidPageNumber(page: number | null): boolean {
  return page !== null && page >= 1 && page <= this.totalPages;
}


goToInputPage() {
  if (this.isValidPageNumber(this.inputPageNumber)) {
    if(this.inputPageNumber)
    this.currentPage = this.inputPageNumber;
    this.inputPageNumber = null; 
  }
}


}
