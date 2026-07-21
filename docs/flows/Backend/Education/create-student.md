---
type: flows
---

# Create Student

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: StudentController.CreateStudent
- **Endpoints**:
  - `POST /education/v{version:apiVersion}/students` (via ApiGateway; internally `api/education/v{version:apiVersion}/students`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education

```mermaid
flowchart TB
  EP_StudentControllerCreateStudent[["StudentController.CreateStudent<br/>(POST)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_CreateStudentCommand("Create Student")
  EP_StudentControllerCreateStudent -->|| REQ_CreateStudentCommand
  REQ_CreateStudentCommand -->|CreateStudentCommandHandler| MOD_Backend_Education
  EVT_education_student_added{{"Student Added"}}
  MOD_Backend_Education -->|CreateStudentCommandHandler| EVT_education_student_added
```
