---
type: flows
---

# Delete Student

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: StudentController.DeleteStudent
- **Endpoints**:
  - `DELETE /education/v{version:apiVersion}/students/{id:guid}` (via ApiGateway; internally `api/education/v{version:apiVersion}/students/{id:guid}`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education

```mermaid
flowchart TB
  EP_StudentControllerDeleteStudent[["StudentController.DeleteStudent<br/>(DELETE)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_DeleteStudentCommand("Delete Student")
  EP_StudentControllerDeleteStudent --> REQ_DeleteStudentCommand
  REQ_DeleteStudentCommand -->|DeleteStudentCommandHandler| MOD_Backend_Education
  EVT_education_student_deleted{{"Student Deleted"}}
  MOD_Backend_Education -->|DeleteStudentCommandHandler| EVT_education_student_deleted
```
