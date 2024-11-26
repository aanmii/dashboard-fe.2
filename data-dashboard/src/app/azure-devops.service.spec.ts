import { TestBed } from '@angular/core/testing';

import { AzureDevOpsService } from './azure-devops.service';

describe('AzureDevopsService', () => {
  let service: AzureDevOpsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AzureDevOpsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
