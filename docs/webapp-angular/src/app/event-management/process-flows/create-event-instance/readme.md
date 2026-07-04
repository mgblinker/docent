---
type: feature
---

# Create event Event Process Strategy Documentation

## Overview

The `CreateeventEventProcessStrategy` is an Angular service that implements the `ProcessStrategy` interface. It manages the process flow for creating a new event event, including capturing event event details and submitting the event event creation request to the backend API.

## Components

### CreateeventEventProcessStrategy

This service handles the overall process of creating a event event. It defines the stages involved in the process and manages the transition between these stages.

#### Key Methods

- `ensureRegistered()`: Ensures that the strategy is registered with the `ProcessStrategyService`.
- `initialize(data: any)`: Initializes the strategy with the provided data.
- `onStageComplete(stageIndex: number, result: any)`: Handles the completion of a stage and processes the result.
- `getStages()`: Returns the list of stages in the process.
- `oneventEventDataCaptured(eventEvent: CreateeventEventRequest)`: Captures the event event data from the form.
- `onFinish()`: Submits the event event creation request to the backend API.

### CaptureeventEventDetailsStageComponent

This component is responsible for capturing the details of the event event being created. It includes a form for entering event event information.

#### Key Methods

- `ngOnInit()`: Initializes the component.
- `onFormValidityChange(isValid: boolean)`: Updates the stage's `canProceed` property based on the form's validity.
- `processStage()`: Processes the current stage and captures the form data.
- `mapTimeSlots(timeSlots: TimeSlotListItem[])`: Maps the time slots to the required DTO format.

### eventEventCreateFormComponent

This component provides the form for creating a event event. It includes fields for event, customer, provider, venue, price, seats, and time slots.

#### Key Methods

- `ngOnInit()`: Sets up the component and initializes the form.
- `initializeForm()`: Initializes the form with the required fields and validators.
- `initializeevent()`: Initializes the event field with the provided initial event data.
- `initializeTimeSlots()`: Initializes the time slots based on the provided start date.
- `oneventSelected(selectedevent: EventTemplateSelectOptionDto | null)`: Handles the selection of a event and updates the form fields accordingly.
- `updateTimeSlots()`: Updates the time slots based on the selected event and start date.
- `loadevents()`, `loadCustomers()`, `loadProviders()`, `loadVenues()`: Loads the options for the respective fields.

## Templates

### `event-instance-create-form.component.html`

This template defines the form structure for creating a event event. It includes fields for event, customer, provider, venue, price, seats, and time slots.

```html
<form [formGroup]="eventEventForm" class="form-grid">
  <mat-card>
    <mat-card-header>
      <mat-card-title
        >{{ 'event-management.event-instance.forms.create.title' | translate }}</mat-card-title
      >
    </mat-card-header>

    <mat-card-content>
      <div class="form-section">
        <mat-form-field
          appearance="fill"
          *ngIf="event?.EventApplicability === EventApplicability.Company">
          <mat-label>{{ 'event-management.event-instance.fields.customer' | translate }}</mat-label>
          <mat-select
            formControlName="customer"
            [compareWith]="compareObjects"
            (focus)="loadCustomers()">
            <mat-option *ngFor="let customer of customers" [value]="customer">
              {{ customer.company }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>{{ 'event-management.event-instance.fields.provider' | translate }}</mat-label>
          <mat-select
            formControlName="provider"
            [compareWith]="compareObjects"
            (focus)="loadProviders()">
            <mat-option *ngFor="let provider of providers" [value]="provider">
              {{ provider.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-checkbox formControlName="defaultProviderChecked">
          {{ 'event-management.event-instance.create.operated-by-default-provider' | translate }}
        </mat-checkbox>

        <mat-form-field appearance="fill">
          <mat-label>{{ 'event-management.event-instance.fields.event' | translate }}</mat-label>
          <mat-select formControlName="event" [compareWith]="compareObjects">
            <mat-option *ngFor="let event of events" [value]="event"> {{ event.name }} </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label
            >{{ 'event-management.event-instance.create.instructor-notes' | translate }}</mat-label
          >
          <textarea matInput formControlName="publicNotes" rows="4"></textarea>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label
            >{{ 'event-management.event-instance.create.office-notes' | translate }}</mat-label
          >
          <textarea matInput formControlName="internalNotes" rows="4"></textarea>
        </mat-form-field>

        <div class="grid-two-columns">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'event-management.event-instance.fields.price' | translate }}</mat-label>
            <input matInput formControlName="price" type="number" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label
              >{{ 'event-management.event-instance.fields.total-seats' | translate }}</mat-label
            >
            <input matInput formControlName="seats" type="number" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="fill">
          <mat-label>{{ 'event-management.event-instance.fields.venue' | translate }}</mat-label>
          <mat-select formControlName="venue" [compareWith]="compareObjects" (focus)="loadVenues()">
            <mat-option *ngFor="let venue of venues" [value]="venue">
              {{ venue.company }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-checkbox formControlName="lunchIncludedChecked">
          {{ 'event-management.event-instance.fields.lunch-included' | translate }}
        </mat-checkbox>

        <app-time-slots-grid
          [firstDayDate]="startDate"
          [numDays]="timeSlotRowCount"
          [locale]="'en'"
          [(timeSlots)]="timeSlots"
          class="time-slots-grid"></app-time-slots-grid>
      </div> </mat-card-content
  ></mat-card>
</form>
```

### `capture-event-instance-details-stage.component.html`

This template includes the `eventEventCreateFormComponent` and binds the form validity change event.

```html
<app-event-instance-create-form
  [eventEventForm]="eventEventForm"
  [initevent]="initevent"
  (formValidityChange)="onFormValidityChange($event)"></app-event-instance-create-form>
```

## Usage

To use the `CreateeventEventProcessStrategy`, ensure it is registered with the `ProcessStrategyService` and included in the process flow. The `CaptureeventEventDetailsStageComponent` should be used to capture the event event details, and the `eventEventCreateFormComponent` provides the form for entering the event event information.
