# BMB Workflows

## Available Workflows in bmb

**audit-workflow**
- Path: `.bmad/bmb/workflows/audit-workflow/workflow.yaml`
- Comprehensive workflow quality audit - validates structure, config standards, variable usage, bloat detection, and web_bundle completeness. Performs deep analysis of workflow.yaml, instructions.md, template.md, and web_bundle configuration against BMAD v6 standards.

**convert-legacy**
- Path: `.bmad/bmb/workflows/convert-legacy/workflow.yaml`
- Converts legacy BMAD v4 or similar items (agents, workflows, modules) to BMad Core compliant format with proper structure and conventions

**create-agent**
- Path: `_bmad/bmb/workflows/create-agent/workflow.md`
- Interactive workflow to build BMAD Core compliant agents with optional brainstorming, persona development, and command structure

**create-module**
- Path: `_bmad/bmb/workflows/create-module/workflow.md`
- Interactive workflow to build complete BMAD modules with agents, workflows, and installation infrastructure

**create-workflow**
- Path: `_bmad/bmb/workflows/create-workflow/workflow.md`
- Create structured standalone workflows using markdown-based step architecture

**edit-agent**
- Path: `_bmad/bmb/workflows/edit-agent/workflow.md`
- Edit existing BMAD agents while following all best practices and conventions

**edit-module**
- Path: `.bmad/bmb/workflows/edit-module/workflow.yaml`
- Edit existing BMAD modules (structure, agents, workflows, documentation) while following all best practices

**edit-workflow**
- Path: `_bmad/bmb/workflows/edit-workflow/workflow.md`
- Intelligent workflow editor that helps modify existing workflows while following best practices

**module-brief**
- Path: `.bmad/bmb/workflows/module-brief/workflow.yaml`
- Create a comprehensive Module Brief that serves as the blueprint for building new BMAD modules using strategic analysis and creative vision

**Meal Prep & Nutrition Plan**
- Path: `_bmad/bmb/workflows/create-workflow/data/examples/meal-prep-nutrition/workflow.md`
- Creates personalized meal plans through collaborative nutrition planning between an expert facilitator and individual seeking to improve their nutrition habits.

**workflow-compliance-check**
- Path: `_bmad/bmb/workflows/workflow-compliance-check/workflow.md`
- Systematic validation of workflows against BMAD standards with adversarial analysis and detailed reporting

**agent**
- Path: `_bmad/bmb/workflows/agent/workflow.md`
- Tri-modal workflow for creating, editing, and validating BMAD Core compliant agents

**module**
- Path: `_bmad/bmb/workflows/module/workflow.md`
- Quad-modal workflow for creating BMAD modules (Brief + Create + Edit + Validate)

**workflow**
- Path: `_bmad/bmb/workflows/workflow/workflow.md`
- Create structured standalone workflows using markdown-based step architecture (tri-modal: create, validate, edit)


## Execution

When running any workflow:
1. LOAD {project-root}/_bmad/core/tasks/workflow.xml
2. Pass the workflow path as 'workflow-config' parameter
3. Follow workflow.xml instructions EXACTLY
4. Save outputs after EACH section

## Modes
- Normal: Full interaction
- #yolo: Skip optional steps
