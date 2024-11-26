export class WorkItem {
  id: number;
  title: string;
  assignedTo: string;
  state: string;
  tags?: string;
  description?: string;
  createdDate?: Date;
  workItemType: string;
  relationType: string;
  links: number[]; // Lista ID-eva povezanih work itema

  constructor(data: Partial<WorkItem>) {
    this.id = data.id || 0;
    this.title = data.title || '';
    this.assignedTo = data.assignedTo || 'Unassigned';
    this.state = data.state || 'Unknown';
    this.tags = data.tags || '';
    this.description = data.description || '';
    this.createdDate = data.createdDate || new Date();
    this.workItemType = data.workItemType || 'Unknown';
    this.links = data.links || [];
    this.relationType = data.relationType || '';
  }
}
