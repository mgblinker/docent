---
type: feature
---

# Test Data Workflow Designer

## Overview
The Test Data Workflow Designer is a web-based canvas interface that allows users to create, configure, and execute test data generation workflows using the Processity workflow engine.

## Features

### 🎨 Visual Canvas Interface
- **Drag & Drop**: Drag test data generation activities from the toolbox onto the canvas
- **Visual Connections**: Connect activities to define execution flow
- **Zoom & Pan**: Navigate large workflows with zoom controls and canvas panning
- **Grid Background**: Snap-to-grid functionality for precise positioning

### 🧰 Activity Toolbox
- **Event Management Data Seeder**: Generate test data for Event Management module
- **Extensible Design**: Easy to add new activity types as they become available
- **Activity Templates**: Pre-configured templates with default settings

### ⚙️ Properties Panel
- **Activity Configuration**: Configure parameters for selected activities
- **Record Settings**: Fine-tune data generation counts and modes (Add/Recreate/Ignore)
- **Real-time Updates**: Changes are applied immediately

### 🎮 Execution Controls
- **Save/Load Workflows**: Persist workflow definitions to the workflow service
- **Execute**: Run workflows through the workflow engine
- **Real-time Monitoring**: Watch execution progress with activity-level status updates
- **Stop/Cancel**: Stop running workflows

### 📊 Execution Monitoring
- **Live Status Updates**: See which activities are running, completed, or failed
- **Progress Tracking**: Overall and per-activity progress indicators
- **Execution Log**: Detailed log with timestamps and status messages
- **Visual Feedback**: Activities change color based on their execution state

## Architecture

### Components
1. **WorkflowDesigner.razor**: Main component containing the canvas, toolbox, and properties panel
2. **WorkflowServiceClient.cs**: HTTP client for communicating with the workflow service
3. **workflow-designer.js**: JavaScript utilities for DOM manipulation and UI interactions

### Integration Points
- **Workflow Service**: Saves, loads, and executes workflow definitions
- **Test Data Generation**: Uses existing test data seeders as workflow activities
- **Authentication & Multi-tenancy**: Integrates with Processity's auth and tenant systems

### Data Models
- **CanvasActivity**: Visual representation of workflow activities on the canvas
- **Connection**: Represents execution flow between activities
- **WorkflowDefinitionDto**: API model for workflow definitions
- **ActivityMetricsDto**: Real-time execution metrics

## Usage

### Creating a Workflow
1. Navigate to `/workflow-designer`
2. Drag activities from the toolbox to the canvas
3. Connect activities by dragging from output to input connection points
4. Configure activity parameters in the properties panel
5. Save the workflow

### Executing a Workflow
1. Click "Execute Workflow" to start execution
2. Monitor progress in the execution status panel
3. Watch activities change color as they execute
4. View detailed logs in the execution log panel

### Configuration Options
Each activity type has specific configuration options:

#### Event Management Data Seeder
- **Event Template Records**: Number of event templates to generate
- **Provider Records**: Number of provider records
- **Instructor Records**: Number of instructor records  
- **Venue Records**: Number of venue records
- **Customer Records**: Number of customer records
- **Event Instance Records**: Number of event instances

Each setting supports three modes:
- **Add**: Add new records to existing data
- **Recreate**: Delete existing records and create new ones
- **Ignore**: Skip this data type

## Technical Implementation

### Frontend (Blazor Server)
- **Interactive Rendering**: Uses `@rendermode InteractiveServer` for real-time updates
- **JavaScript Interop**: Canvas interactions handled via JavaScript
- **CSS Animations**: Smooth transitions and visual feedback
- **Responsive Design**: Works on desktop and tablet devices

### Backend Integration
- **Workflow Service**: RESTful API for workflow management
- **HTTP Client**: Configured with service discovery and authentication
- **Real-time Monitoring**: Polls workflow status during execution
- **Error Handling**: Comprehensive error handling with user feedback

### Workflow Engine Integration
The designer integrates with Processity's workflow engine by:
1. Converting canvas activities to workflow activity definitions
2. Mapping visual connections to workflow dependencies
3. Serializing activity parameters for execution
4. Monitoring execution status through the workflow service API

## Development Notes

### Adding New Activity Types
To add a new activity type:
1. Add the activity template to `availableActivityTemplates`
2. Implement parameter configuration in the properties panel
3. Add icon mapping in `GetIconForActivityType()`
4. Update default settings in `GetDefaultSettings()`

### Customizing the Canvas
The canvas behavior can be customized by modifying:
- **CSS Classes**: Visual styling and animations
- **JavaScript Functions**: DOM manipulation and interaction handling
- **Zoom/Pan Logic**: Canvas navigation controls

### Error Handling
The application includes comprehensive error handling:
- **Network Errors**: HTTP client failures with retry logic
- **Workflow Errors**: Execution failures with detailed error messages
- **UI Errors**: JavaScript errors with graceful degradation
- **User Feedback**: Toast notifications for all operations

## Future Enhancements

### Planned Features
- **Activity Library**: Expanded set of test data generation activities
- **Workflow Templates**: Pre-built workflow templates for common scenarios
- **Collaborative Editing**: Multi-user workflow editing
- **Version Control**: Workflow versioning and history
- **Advanced Monitoring**: Detailed execution metrics and analytics

### Technical Improvements
- **Performance**: Optimize canvas rendering for large workflows
- **Accessibility**: Add keyboard navigation and screen reader support
- **Mobile**: Responsive design for mobile devices
- **Offline**: Offline editing capabilities with sync

## Dependencies

### NuGet Packages
- `System.Net.Http.Json`: HTTP client JSON extensions
- `Microsoft.JSInterop`: JavaScript interop for Blazor

### Frontend Dependencies
- **Tailwind CSS**: Utility-first CSS framework
- **Blazor Server**: Server-side rendering framework

### Service Dependencies
- **Workflow Service**: Processity workflow engine
- **Test Data Generator Service**: Test data generation backend
- **Authentication Service**: User authentication and authorization
- **Multi-tenancy Service**: Tenant management and context