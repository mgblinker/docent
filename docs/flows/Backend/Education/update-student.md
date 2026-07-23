---
type: flows
---

# Update Student

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: StudentController.UpdateStudent
- **Endpoints**:
  - `PUT /education/v{version:apiVersion}/students/{id:guid}` (via ApiGateway; internally `api/education/v{version:apiVersion}/students/{id:guid}`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education

```mermaid
flowchart TB
  EP_StudentControllerUpdateStudent[["StudentController.UpdateStudent<br/>(PUT)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_UpdateStudentCommand("Update Student")
  EP_StudentControllerUpdateStudent --> REQ_UpdateStudentCommand
  REQ_UpdateStudentCommand -->|UpdateStudentCommandHandler| MOD_Backend_Education
  EVT_education_student_updated{{"Student Updated"}}
  MOD_Backend_Education -->|UpdateStudentCommandHandler| EVT_education_student_updated
```
