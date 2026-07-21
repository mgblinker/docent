---
type: flows
---

# Delete Learning Path Definition

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: LearningPathDefinitionController.DeleteLearningPathDefinition
- **Endpoints**:
  - `DELETE /education/v{version:apiVersion}/learning-path-definitions/{id:guid}` (via ApiGateway; internally `api/education/v{version:apiVersion}/learning-path-definitions/{id:guid}`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education

```mermaid
flowchart TB
  EP_LearningPathDefinitionControllerDeleteLearningPathDefinition[["LearningPathDefinitionController.DeleteLearningPathDefinition<br/>(DELETE)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_DeleteLearningPathDefinitionCommand("Delete Learning Path<br/>Definition")
  EP_LearningPathDefinitionControllerDeleteLearningPathDefinition -->|| REQ_DeleteLearningPathDefinitionCommand
  REQ_DeleteLearningPathDefinitionCommand -->|DeleteLearningPathDefinitionCommandHandler| MOD_Backend_Education
  EVT_education_learning_path_definition_deleted{{"Learning Path Definition<br/>Deleted"}}
  MOD_Backend_Education -->|DeleteLearningPathDefinitionCommandHandler| EVT_education_learning_path_definition_deleted
```
