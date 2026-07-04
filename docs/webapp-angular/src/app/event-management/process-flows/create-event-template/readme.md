---
type: feature
---

# Create event Process Strategy Documentation

## Overview

The `CreateeventProcessStrategy` is an Angular service that implements the `ProcessStrategy` interface. It manages the process flow for creating a new event, including capturing event details and submitting the event creation request to the backend API.

## Components

### CreateeventProcessStrategy

This service handles the overall process of creating a event. It defines the stages involved in the process and manages the transition between these stages.

#### Key Methods

- `ensureRegistered()`: Ensures that the strategy is registered with the
- `ProcessStrategyService`
- `onStageComplete(stageIndex: number, result: any)`: Handles the completion of a stage and processes the result.
- `getStages()`: Returns the list of stages in the process.
- `oneventDataCaptured(event: CreateeventRequest)`: Captures the event data from the form.
- `onFinish()`: Submits the event creation request to the backend API.

### CaptureeventDetailsStageComponent

This component is responsible for capturing the details of the event being created. It includes a form for entering event information.

#### Key Methods

- `ngOnInit()`: Initializes the form and sets up the component.
- `initForm()`: Initializes the form with the required fields and validators.
- `onFormValidityChange(isValid: boolean)`: Updates the stage's `canProceed` property based on the form's validity.
- `processStage()`: Processes the current stage and captures the form data.

### eventCreateComponent

This component provides the form for creating a event. It includes fields for event applicability, name, days, price, and total seats.

#### Key Methods

- `ngOnInit()`: Sets up the form status change subscription to emit form validity changes.

## Templates

### `create-event-template.component.html`

This template defines the form structure for creating a event. It includes fields for event applicability, name, days, price, and total seats.

```html
<form [formGroup]="eventForm" class="new-event-form">
  <mat-card>
    <mat-card-header>
      <mat-card-title>{{ 'event-management.event.forms.create.title' | translate }}</mat-card-title>
    </mat-card-header>

    <mat-card-content>
      <!-- Personal Information Section -->
      <div class="form-section">
        <div class="grid-1-3">
          <mat-form-field appearance="fill">
            <mat-label
              >{{ 'event-management.event.fields.event-applicability' | translate }}</mat-label
            >
            <mat-select formControlName="EventApplicability">
              <mat-option
                *ngFor="let EventApplicability of eventApplicabilities"
                [value]="EventApplicability.value">
                {{ 'event-management.event.field-values.event-applicability.' +
                (EventApplicability.value | enumToString : EventApplicability) | translate }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div class="spacer"></div>
        </div>

        <div class="grid-1">
          <mat-form-field appearance="fill" style="width: 100%">
            <mat-label>{{ 'event-management.event.fields.name' | translate }}</mat-label>
            <input matInput formControlName="name" />
            <mat-error *ngIf="eventForm.get('name')?.hasError('required')">
              {{ 'system.errors.validation.field-required' | translate : { field:
              ('event-management.event.fields.name' | translate) } }}
            </mat-error>
          </mat-form-field>
        </div>

        <div class="grid-1-1-1">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'event-management.event.fields.event-days' | translate }}</mat-label>
            <input matInput formControlName="eventDays" />
            <mat-error *ngIf="eventForm.get('eventDays')?.hasError('required')">
              {{ 'system.errors.validation.field-required' | translate : { field:
              ('event-management.event.fields.event-days' | translate) } }}
            </mat-error>
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>{{ 'event-management.event.fields.price' | translate }}</mat-label>
            <input matInput formControlName="price" />
            <mat-error *ngIf="eventForm.get('price')?.hasError('required')">
              {{ 'system.errors.validation.field-required' | translate : { field:
              ('event-management.event.fields.price' | translate) } }}
            </mat-error>
            <mat-error *ngIf="eventForm.get('price')?.hasError('pattern')">
              Price must be a number
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'event-management.event.fields.seats' | translate }}</mat-label>
            <input matInput formControlName="totalSeats" />
            <mat-error *ngIf="eventForm.get('totalSeats')?.hasError('required')">
              {{ 'system.errors.validation.field-required' | translate : { field:
              ('event-management.event.fields.seats' | translate) } }}
            </mat-error>
            <mat-error *ngIf="eventForm.get('totalSeats')?.hasError('pattern')">
              Total Seats must be a number
            </mat-error>
          </mat-form-field>
        </div>
      </div></mat-card-content
    ></mat-card
  >
</form>
```

### `capture-event-details-stage.component.html`

This template includes the `eventCreateComponent` and binds the form validity change event.

```html
<app-create-event-template
  [eventForm]="eventForm"
  (formValidityChange)="onFormValidityChange($event)"></app-create-event-template>
```

## Usage

To use the `CreateeventProcessStrategy`, ensure it is registered with the `ProcessStrategyService` and included in the process flow. The `CaptureeventDetailsStageComponent` should be used to capture the event details, and the `eventCreateComponent` provides the form for entering the event information.
