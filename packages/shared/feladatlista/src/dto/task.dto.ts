import { z } from 'zod';
import { TaskType, TaskStatus, TaskPriority } from '../interfaces/task.interface';

/**
 * Task DTOs with Zod validation - Epic 12
 */

// Base schemas
export const TaskTypeSchema = z.nativeEnum(TaskType);
export const TaskStatusSchema = z.nativeEnum(TaskStatus);
export const TaskPrioritySchema = z.nativeEnum(TaskPriority);

/**
 * Create Task DTO - Stories 12.1, 12.2, 12.4
 */
export const CreateTaskDtoSchema = z.object({
  type: TaskTypeSchema,
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  priority: TaskPrioritySchema.default(TaskPriority.MEDIUM),
  quantity: z.number().int().positive().optional(),
  targetLocation: z.string().max(200).optional(),
  assigneeIds: z.array(z.string().uuid()).default([]),
  isPersonal: z.boolean().default(false),
  dueDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    // Shopping type requires quantity
    if (data.type === TaskType.SHOPPING && data.quantity === undefined) {
      return true; // Allow missing quantity, will default to 1
    }
    return true;
  },
  { message: 'Quantity recommended for shopping items' }
).refine(
  (data) => {
    // Personal notes cannot have assignees
    if (data.type === TaskType.NOTE && data.isPersonal && data.assigneeIds.length > 0) {
      return false;
    }
    return true;
  },
  { message: 'Personal notes cannot have assignees' }
);

export type CreateTaskDto = z.infer<typeof CreateTaskDtoSchema>;

/**
 * Update Task DTO
 */
export const UpdateTaskDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: TaskPrioritySchema.optional(),
  quantity: z.number().int().positive().optional().nullable(),
  targetLocation: z.string().max(200).optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

export type UpdateTaskDto = z.infer<typeof UpdateTaskDtoSchema>;

/**
 * Change Status DTO - Story 12.3
 */
export const ChangeTaskStatusDtoSchema = z.object({
  taskId: z.string().uuid(),
  newStatus: TaskStatusSchema,
}).refine(
  (_data) => {
    // Cannot transition directly from OPEN to DONE (must go through IN_PROGRESS)
    // This is handled in service logic, not DTO validation
    return true;
  }
);

export type ChangeTaskStatusDto = z.infer<typeof ChangeTaskStatusDtoSchema>;

/**
 * Complete Task DTO - Story 12.3
 */
export const CompleteTaskDtoSchema = z.object({
  taskId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});

export type CompleteTaskDto = z.infer<typeof CompleteTaskDtoSchema>;

/**
 * Task Filter DTO - Story 12.5
 */
export const TaskFilterDtoSchema = z.object({
  type: TaskTypeSchema.optional(),
  status: TaskStatusSchema.optional(),
  assigneeId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  includePersonal: z.boolean().default(false),
  priority: TaskPrioritySchema.optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
}).refine(
  (data) => {
    // Validate date range order if both are provided
    if (data.dueDateFrom && data.dueDateTo) {
      return data.dueDateFrom <= data.dueDateTo;
    }
    return true;
  },
  { message: 'dueDateFrom must be before or equal to dueDateTo', path: ['dueDateTo'] }
);

export type TaskFilterDto = z.infer<typeof TaskFilterDtoSchema>;

/**
 * Assign Task DTO - Story 12.2
 */
export const AssignTaskDtoSchema = z.object({
  taskId: z.string().uuid(),
  assigneeIds: z.array(z.string().uuid()).min(1, 'At least one assignee required'),
  notifyAssignees: z.boolean().default(true),
});

export type AssignTaskDto = z.infer<typeof AssignTaskDtoSchema>;

/**
 * Bulk Status Update DTO
 */
export const BulkStatusUpdateDtoSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(50),
  newStatus: TaskStatusSchema,
});

export type BulkStatusUpdateDto = z.infer<typeof BulkStatusUpdateDtoSchema>;

/**
 * Validation helper functions
 */
export function validateCreateTask(data: unknown): CreateTaskDto {
  return CreateTaskDtoSchema.parse(data);
}

export function validateUpdateTask(data: unknown): UpdateTaskDto {
  return UpdateTaskDtoSchema.parse(data);
}

export function validateChangeStatus(data: unknown): ChangeTaskStatusDto {
  return ChangeTaskStatusDtoSchema.parse(data);
}

export function validateTaskFilter(data: unknown): TaskFilterDto {
  return TaskFilterDtoSchema.parse(data);
}

export function validateAssignTask(data: unknown): AssignTaskDto {
  return AssignTaskDtoSchema.parse(data);
}
