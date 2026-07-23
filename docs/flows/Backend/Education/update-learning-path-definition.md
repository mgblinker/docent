---
type: flows
---

# Update Learning Path Definition

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: LearningPathDefinitionController.UpdateLearningPathDefinition
- **Endpoints**:
  - `PUT /education/v{version:apiVersion}/learning-path-definitions/{id:guid}` (via ApiGateway; internally `api/education/v{version:apiVersion}/learning-path-definitions/{id:guid}`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education

```mermaid
flowchart TB
  EP_LearningPathDefinitionControllerUpdateLearningPathDefinition[["LearningPathDefinitionController.UpdateLearningPathDefinition<br/>(PUT)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_UpdateLearningPathDefinitionCommand("Update Learning Path<br/>Definition")
  EP_LearningPathDefinitionControllerUpdateLearningPathDefinition --> REQ_UpdateLearningPathDefinitionCommand
  REQ_UpdateLearningPathDefinitionCommand -->|UpdateLearningPathDefinitionCommandHandler| MOD_Backend_Education
  EVT_education_learning_path_definition_updated{{"Learning Path Definition<br/>Updated"}}
  MOD_Backend_Education -->|UpdateLearningPathDefinitionCommandHandler| EVT_education_learning_path_definition_updated
```
