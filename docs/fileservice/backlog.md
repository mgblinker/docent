## FS-001: Structured File Storage
We are intending to re-think the existing file storage service (akind OneDrive or Google Drive) allowing to securely store, read, modify and delete files. As in the existing big-vendor solutions, our service shall have a client component allowing to synchronize local files with files in the service.

### Key Requirements
* CRUD File operations
* Folder / file structure individually determinable
* Permission settings (restrict file and folder access, share files)
* Integration with data stored in other services must still be possible (when uploading files for records they shall be stored in a sensible location - find a practical solution for this - , and there must be a link to display files belonging to this location with related views for these records)

### Non-functional requirements
* Multi tenancy using shared kernel components
* Infisical KeyVault integration using shared kernel
* Integration with authentication service