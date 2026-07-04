---
type: feature
---

Model discovery subsystem

- AddModelDiscovery() registers the registry used by the discovery controller.
- Modules can implement `IDiscoveryProvider` and register it using `services.RegisterDiscoveryProvider<YourProvider>("ModuleName")` during module startup, or they can declare discoverable objects in configuration and use `AddConfigDiscoveryProvider`.

Controller endpoints:
- GET /api/discovery/modules/{moduleName}/objects -> list of main objects
- GET /api/discovery/modules/{moduleName}/objects/{objectName} -> fields and relationships for the object

Example configuration (appsettings.json):

{
	"Discovery": {
		"CourseManagement": {
			"Objects": [
				{
					"Name": "Course",
					"DisplayName": "Course",
					"Fields": [ { "Name": "Id", "Type": "Guid" }, { "Name": "Title", "Type": "string" } ],
					"Relationships": [ { "Name": "Participants", "TargetObject": "Participant", "IsCollection": true } ]
				}
			]
		}
	}
}

To register config-driven provider in startup (module or host):

services.AddModelDiscovery();
services.AddConfigDiscoveryProvider(Configuration, "Discovery:CourseManagement", "CourseManagement");

