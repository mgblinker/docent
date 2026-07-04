---
type: feature
---

# Process Dialog (generic component) Documentation

## Overview

The `ProcessDialogComponent` is a versatile Angular component designed to handle multi-step processes. It leverages a strategy pattern to dynamically load and manage different stages of a process. This component is highly configurable and can be used for various workflows by defining appropriate strategies.

### Key Files

- **Component HTML**: `process-dialog.component.html`
- **Component TypeScript**: `process-dialog.component.ts`
- **Process Strategy Interface**: `process-strategy.interface.ts`
- **Form Processor Factory**: `form-processor.factory.ts`

## Usage

### Importing the Component

To use the `ProcessDialogComponent`, you need to import it into your module:

```typescript
import { ProcessDialogComponent } from 'src/shared/components/process-dialog/process-dialog.component';
```

You can open the `ProcessDialogComponent` using Angular Material's `MatDialog`. Here is an example of how to open the dialog and pass the necessary data:

```typescript
import { MatDialog } from '@angular/material/dialog';
import { ProcessDialogComponent } from 'src/shared/components/process-dialog/process-dialog.component';

constructor(private dialog: MatDialog) {}

openProcessDialog() {
  const dialogRef = this.dialog.open(ProcessDialogComponent, {
    minWidth: '800px',
    width: '80%',
    maxWidth: '90%',
    data: { processType: 'createCourseEvent', initCourse: courseData, startDate: arg.date }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // Handle the result
    }
  });
}
```

### Process Strategy Interface

The `ProcessStrategy` interface defines the structure for process strategies. It includes methods for initialization, handling the completion of a stage, and completing the process.

```typescript
export interface ProcessStage {
  title: string;
  component: Type<any>;
  inputs: Record<string, any>;
  canProceed: boolean;
  showNextButton: boolean;
}

export interface ProcessResult {
  success: boolean;
  message: string;
}

export interface ProcessStrategy {
  stages: ProcessStage[];
  initialize?: (data: any) => void;
  onStageComplete(stageIndex: number, result: any): void;
  onFinish(): Observable<ProcessResult>;
  moveToNextStage(): void;
}
```

### Example Strategy Implementation

Here is an example of a strategy implementation for creating a course event:

```typescript
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProcessStrategy, ProcessResult } from 'src/shared/interfaces/process-strategy.interface';
import { CaptureCourseEventDetailsStageComponent } from './stages/capture-course-event-details-stage/capture-course-event-details-stage.component';

@Injectable({
  providedIn: 'root'
})
export class CreateCourseEventProcessStrategy implements ProcessStrategy {
  private courseEventData: CreateCourseEventRequest | undefined;
  private initCourse: CourseSelectOptionDto | undefined;
  moveToNextStage!: () => void;

  stages = [
    {
      title:
        'course-management.process-flows.create-course-event.stages.capture-course-event-details.title',
      component: CaptureCourseEventDetailsStageComponent,
      inputs: {},
      canProceed: false,
      showNextButton: true
    }
  ];

  constructor(
    private readonly strategyService: ProcessStrategyService,
    private readonly courseEventService: CourseEventApiService
  ) {
    this.ensureRegistered();
  }

  initialize(data: any): void {
    this.initCourse = data.initCourse;
    this.stages.inputs = {
      initCourse: this.initCourse,
      startDate: data.startDate
    };
  }

  private ensureRegistered() {
    if (!this.strategyService.hasStrategy('createCourseEvent')) {
      this.strategyService.registerStrategy('createCourseEvent', this);
    }
  }

  onStageComplete(stageIndex: number, result: any) {
    console.log('Stage complete:', stageIndex, result);
    switch (stageIndex) {
      case 0:
        this.onCourseEventDataCaptured(result);
        break;
    }
  }

  private onCourseEventDataCaptured(courseEvent: CreateCourseEventRequest) {
    console.log('Course event data captured:', courseEvent);
    this.courseEventData = courseEvent;
    this.stages.canProceed = true;
  }

  onFinish(): Observable<ProcessResult> {
    if (this.courseEventData) {
      console.log('Creating course:', this.courseEventData);
      return this.courseEventService.createCourseEvent(this.courseEventData).pipe(
        map(() => ({
          success: true,
          message: 'course-management.process-flows.create-course.messages.success'
        })),
        catchError((error) => {
          console.error('Error creating course event:', error);
          return from([
            {
              success: false,
              message: 'course-management.process-flows.create-course-event.errors.create'
            }
          ]);
        })
      );
    }

    return from([
      {
        success: false,
        message: 'course-management.process-flows.create-course-event.errors.invalid-course-data'
      }
    ]);
  }
}
```

## Related Elements

### Form Processor Factory

The `FormProcessor` abstract class defines a contract for processing forms. It can be extended to create specific form processors.

```typescript
import { Observable } from 'rxjs';

export abstract class FormProcessor<T> {
  abstract processForm(formValue: any): Observable<T>;
}
```

# Conclusion

The `ProcessDialogComponent` is a powerful tool for managing multi-step processes in an Angular application. By leveraging the strategy pattern, it provides a flexible and reusable way to handle various workflows. Implementing custom strategies allows you to tailor the component to your specific needs while keeping the core logic clean and maintainable.
