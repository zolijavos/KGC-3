import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from './task.service';
import {
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskPermissionContext,
} from '../interfaces/task.interface';
import { CreateTaskDto, TaskFilterDto } from '../dto/task.dto';

describe('TaskService', () => {
  let service: TaskService;
  let userContext: TaskPermissionContext;
  let managerContext: TaskPermissionContext;

  const TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const LOCATION_ID = '22222222-2222-2222-2222-222222222222';
  const USER_ID = '33333333-3333-3333-3333-333333333333';
  const MANAGER_ID = '44444444-4444-4444-4444-444444444444';
  const OTHER_USER_ID = '55555555-5555-5555-5555-555555555555';

  beforeEach(() => {
    service = new TaskService();
    service.clearAll();

    userContext = {
      userId: USER_ID,
      tenantId: TENANT_ID,
      locationId: LOCATION_ID,
      isManager: false,
      canViewAll: false,
      canManageAll: false,
    };

    managerContext = {
      userId: MANAGER_ID,
      tenantId: TENANT_ID,
      locationId: LOCATION_ID,
      isManager: true,
      canViewAll: true,
      canManageAll: true,
    };
  });

  // =====================================================
  // Story 12.1: Bevásárlólista Tétel
  // =====================================================
  describe('Story 12.1: Shopping List Items', () => {
    it('should create a shopping list item with quantity', async () => {
      const input: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'Milk',
        quantity: 2,
        targetLocation: 'Tesco',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.id).toBeDefined();
      expect(task.type).toBe(TaskType.SHOPPING);
      expect(task.title).toBe('Milk');
      expect(task.quantity).toBe(2);
      expect(task.targetLocation).toBe('Tesco');
      expect(task.status).toBe(TaskStatus.OPEN);
      expect(task.createdBy).toBe(USER_ID);
    });

    it('should default quantity to 1 for shopping items', async () => {
      const input: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'Bread',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.quantity).toBe(1);
    });

    it('should record creator and timestamp automatically', async () => {
      const beforeCreate = new Date();
      const input: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'Coffee',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.createdBy).toBe(USER_ID);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });

    it('should detect duplicate shopping items', async () => {
      const input: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'Milk',
        quantity: 1,
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      await service.create(input, userContext);

      // Try to create duplicate
      await expect(service.create(input, userContext)).rejects.toThrow('Similar task already exists');
    });

    it('should detect similar (not exact) duplicates', async () => {
      const input1: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'Buy milk',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      await service.create(input1, userContext);

      const input2: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'buy Milk', // Different case
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      await expect(service.create(input2, userContext)).rejects.toThrow('Similar task already exists');
    });
  });

  // =====================================================
  // Story 12.2: To-Do Feladat Felelőssel
  // =====================================================
  describe('Story 12.2: To-Do Tasks with Assignees', () => {
    it('should create a to-do task with assignees', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Clean the warehouse',
        assigneeIds: [OTHER_USER_ID],
        dueDate: new Date('2026-01-20'),
        priority: TaskPriority.HIGH,
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.type).toBe(TaskType.TODO);
      expect(task.assigneeIds).toContain(OTHER_USER_ID);
      expect(task.dueDate).toBeInstanceOf(Date);
    });

    it('should create a to-do without due date (optional)', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Review inventory',
        assigneeIds: [],
        priority: TaskPriority.MEDIUM,
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.dueDate).toBeUndefined();
    });

    it('should assign task to users', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Check equipment',
        assigneeIds: [],
        priority: TaskPriority.MEDIUM,
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      const updated = await service.assign(
        { taskId: task.id, assigneeIds: [OTHER_USER_ID], notifyAssignees: true },
        userContext
      );

      expect(updated.assigneeIds).toContain(OTHER_USER_ID);
    });

    it('should allow multiple assignees', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Team meeting',
        assigneeIds: [USER_ID, OTHER_USER_ID, MANAGER_ID],
        priority: TaskPriority.MEDIUM,
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.assigneeIds).toHaveLength(3);
      expect(task.assigneeIds).toContain(USER_ID);
      expect(task.assigneeIds).toContain(OTHER_USER_ID);
      expect(task.assigneeIds).toContain(MANAGER_ID);
    });

    it('should only allow creator or manager to assign', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Secret task',
        assigneeIds: [],
        priority: TaskPriority.MEDIUM,
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      const otherUserContext: TaskPermissionContext = {
        ...userContext,
        userId: OTHER_USER_ID,
      };

      await expect(
        service.assign({ taskId: task.id, assigneeIds: [MANAGER_ID], notifyAssignees: true }, otherUserContext)
      ).rejects.toThrow('Only task creator or manager can assign');
    });
  });

  // =====================================================
  // Story 12.3: Feladat Státusz és Kipipálás
  // =====================================================
  describe('Story 12.3: Task Status and Completion', () => {
    it('should start tasks in OPEN status', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'New task',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      expect(task.status).toBe(TaskStatus.OPEN);
    });

    it('should change status to IN_PROGRESS', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Work task',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      const updated = await service.changeStatus(
        { taskId: task.id, newStatus: TaskStatus.IN_PROGRESS },
        userContext
      );

      expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should complete task and record who/when', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Finish this',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      const completed = await service.complete(task.id, userContext);

      expect(completed.status).toBe(TaskStatus.DONE);
      expect(completed.completedBy).toBe(USER_ID);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });

    it('should allow direct OPEN to DONE transition', async () => {
      const input: CreateTaskDto = {
        type: TaskType.SHOPPING,
        title: 'Quick purchase',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);

      const completed = await service.changeStatus(
        { taskId: task.id, newStatus: TaskStatus.DONE },
        userContext
      );

      expect(completed.status).toBe(TaskStatus.DONE);
    });

    it('should record status change in history', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'History test',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);
      await service.changeStatus(
        { taskId: task.id, newStatus: TaskStatus.IN_PROGRESS },
        userContext
      );

      const history = await service.getHistory(task.id, userContext);

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some((h) => h.action === 'STATUS_CHANGED')).toBe(true);
    });

    it('should not allow transition from ARCHIVED', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Archive test',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);
      await service.delete(task.id, userContext); // Archives the task

      await expect(
        service.changeStatus(
          { taskId: task.id, newStatus: TaskStatus.OPEN },
          userContext
        )
      ).rejects.toThrow('Invalid status transition');
    });

    it('should archive completed tasks', async () => {
      const input: CreateTaskDto = {
        type: TaskType.TODO,
        title: 'Archive after done',
        priority: TaskPriority.MEDIUM,
        assigneeIds: [],
        isPersonal: false,
      };

      const task = await service.create(input, userContext);
      await service.complete(task.id, userContext);

      const archived = await service.changeStatus(
        { taskId: task.id, newStatus: TaskStatus.ARCHIVED },
        userContext
      );

      expect(archived.status).toBe(TaskStatus.ARCHIVED);
    });
  });

  // =====================================================
  // Story 12.4: Személyes Jegyzet
  // =====================================================
  describe('Story 12.4: Personal Notes', () => {
    it('should create personal note visible only to creator', async () => {
      const input: CreateTaskDto = {
        type: TaskType.NOTE,
        title: 'My private thoughts',
        description: 'Secret content',
        isPersonal: true,
        priority: TaskPriority.LOW,
        assigneeIds: [],
      };

      const task = await service.create(input, userContext);

      expect(task.type).toBe(TaskType.NOTE);
      expect(task.isPersonal).toBe(true);
      expect(task.createdBy).toBe(USER_ID);
    });

    it('should prevent other users from seeing personal notes', async () => {
      const input: CreateTaskDto = {
        type: TaskType.NOTE,
        title: 'Private note',
        isPersonal: true,
        priority: TaskPriority.LOW,
        assigneeIds: [],
      };

      const task = await service.create(input, userContext);

      const otherUserContext: TaskPermissionContext = {
        ...userContext,
        userId: OTHER_USER_ID,
      };

      await expect(service.findById(task.id, otherUserContext)).rejects.toThrow(
        'Cannot access personal tasks of other users'
      );
    });

    it('should prevent managers from seeing others personal notes', async () => {
      const input: CreateTaskDto = {
        type: TaskType.NOTE,
        title: 'User private note',
        isPersonal: true,
        priority: TaskPriority.LOW,
        assigneeIds: [],
      };

      const task = await service.create(input, userContext);

      // Manager tries to access
      await expect(service.findById(task.id, managerContext)).rejects.toThrow(
        'Cannot access personal tasks of other users'
      );
    });

    it('should not allow assignees on personal notes', async () => {
      const input: CreateTaskDto = {
        type: TaskType.NOTE,
        title: 'Private with assignee',
        isPersonal: true,
        assigneeIds: [OTHER_USER_ID],
        priority: TaskPriority.LOW,
      };

      await expect(service.create(input, userContext)).rejects.toThrow(
        'Personal notes cannot have assignees'
      );
    });

    it('should not allow assigning personal tasks later', async () => {
      const input: CreateTaskDto = {
        type: TaskType.NOTE,
        title: 'Private note',
        isPersonal: true,
        priority: TaskPriority.LOW,
        assigneeIds: [],
      };

      const task = await service.create(input, userContext);

      await expect(
        service.assign({ taskId: task.id, assigneeIds: [OTHER_USER_ID], notifyAssignees: true }, userContext)
      ).rejects.toThrow('Cannot assign personal tasks');
    });

    it('should isolate personal notes at location level', async () => {
      const input: CreateTaskDto = {
        type: TaskType.NOTE,
        title: 'Location private',
        isPersonal: true,
        priority: TaskPriority.LOW,
        assigneeIds: [],
      };

      await service.create(input, userContext);

      const filter: TaskFilterDto = {
        includePersonal: true,
        page: 1,
        pageSize: 20,
      };

      const result = await service.findMany(filter, userContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.isPersonal).toBe(true);
    });
  });

  // =====================================================
  // Story 12.5: Boltvezető Lista Hozzáférés
  // =====================================================
  describe('Story 12.5: Manager Access', () => {
    it('should allow manager to see all non-personal tasks', async () => {
      // Create tasks by different users
      await service.create(
        { type: TaskType.TODO, title: 'Manager test - First user task alpha', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const otherUserContext: TaskPermissionContext = {
        ...userContext,
        userId: OTHER_USER_ID,
      };
      await service.create(
        { type: TaskType.TODO, title: 'Manager test - Second user task beta', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        otherUserContext
      );

      const filter: TaskFilterDto = { page: 1, pageSize: 20 };
      const result = await service.findMany(filter, managerContext);

      expect(result.tasks.length).toBe(2);
    });

    it('should filter by assignee', async () => {
      await service.create(
        { type: TaskType.TODO, title: 'Assignee filter - Task for main user', assigneeIds: [USER_ID], priority: TaskPriority.MEDIUM, isPersonal: false },
        managerContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Assignee filter - Task for other user', assigneeIds: [OTHER_USER_ID], priority: TaskPriority.MEDIUM, isPersonal: false },
        managerContext
      );

      const filter: TaskFilterDto = { assigneeId: USER_ID, page: 1, pageSize: 20 };
      const result = await service.findMany(filter, managerContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.assigneeIds).toContain(USER_ID);
    });

    it('should filter by status', async () => {
      const task = await service.create(
        { type: TaskType.TODO, title: 'Open task', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.complete(task.id, userContext);

      await service.create(
        { type: TaskType.TODO, title: 'Still open', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const filter: TaskFilterDto = { status: TaskStatus.OPEN, page: 1, pageSize: 20 };
      const result = await service.findMany(filter, managerContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.status).toBe(TaskStatus.OPEN);
    });

    it('should filter by type', async () => {
      await service.create(
        { type: TaskType.SHOPPING, title: 'Buy stuff', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Do stuff', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const filter: TaskFilterDto = { type: TaskType.SHOPPING, page: 1, pageSize: 20 };
      const result = await service.findMany(filter, managerContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.type).toBe(TaskType.SHOPPING);
    });

    it('should provide statistics', async () => {
      await service.create(
        { type: TaskType.SHOPPING, title: 'Statistics test - Buy groceries for stats', priority: TaskPriority.HIGH, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Statistics test - First todo item', priority: TaskPriority.MEDIUM, assigneeIds: [USER_ID], isPersonal: false },
        userContext
      );
      const task = await service.create(
        { type: TaskType.TODO, title: 'Statistics test - Second todo item', priority: TaskPriority.LOW, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.complete(task.id, userContext);

      const stats = await service.getStatistics(managerContext);

      expect(stats.totalTasks).toBe(3);
      expect(stats.byType[TaskType.SHOPPING]).toBe(1);
      expect(stats.byType[TaskType.TODO]).toBe(2);
      expect(stats.byStatus[TaskStatus.OPEN]).toBe(2);
      expect(stats.byStatus[TaskStatus.DONE]).toBe(1);
      expect(stats.completedToday).toBe(1);
    });

    it('should search in title and description', async () => {
      await service.create(
        { type: TaskType.TODO, title: 'Important meeting', description: 'Discuss budget', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Random task', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const filter: TaskFilterDto = { search: 'meeting', page: 1, pageSize: 20 };
      const result = await service.findMany(filter, managerContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.title).toContain('meeting');
    });

    it('should paginate results', async () => {
      // Create 25 tasks with completely different titles
      const titles = [
        'Buy coffee beans', 'Fix the printer', 'Call the supplier', 'Review inventory', 'Clean warehouse',
        'Update software', 'Order new equipment', 'Schedule meeting', 'Write report', 'Check deliveries',
        'Train new employee', 'Organize files', 'Repair door', 'Install shelves', 'Count stock',
        'Contact customer', 'Process returns', 'Update prices', 'Check security', 'Water plants',
        'Replace lights', 'Test alarms', 'Sort packages', 'Label products', 'Archive documents'
      ];
      for (let i = 0; i < 25; i++) {
        await service.create(
          { type: TaskType.TODO, title: titles[i]!, priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
          userContext
        );
      }

      const page1: TaskFilterDto = { page: 1, pageSize: 10 };
      const result1 = await service.findMany(page1, managerContext);

      expect(result1.tasks.length).toBe(10);
      expect(result1.total).toBe(25);
      expect(result1.hasMore).toBe(true);

      const page2: TaskFilterDto = { page: 2, pageSize: 10 };
      const result2 = await service.findMany(page2, managerContext);

      expect(result2.tasks.length).toBe(10);
      expect(result2.hasMore).toBe(true);

      const page3: TaskFilterDto = { page: 3, pageSize: 10 };
      const result3 = await service.findMany(page3, managerContext);

      expect(result3.tasks.length).toBe(5);
      expect(result3.hasMore).toBe(false);
    });
  });

  // =====================================================
  // Additional Tests: Tenant Isolation
  // =====================================================
  describe('Tenant Isolation', () => {
    it('should isolate tasks by tenant', async () => {
      await service.create(
        { type: TaskType.TODO, title: 'Tenant 1 task', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const otherTenantContext: TaskPermissionContext = {
        ...userContext,
        tenantId: '99999999-9999-9999-9999-999999999999',
      };

      const result = await service.findMany({ page: 1, pageSize: 20 }, otherTenantContext);

      expect(result.tasks.length).toBe(0);
    });
  });

  // =====================================================
  // Additional Tests: Update and Delete
  // =====================================================
  describe('Update and Delete', () => {
    it('should update task properties', async () => {
      const task = await service.create(
        { type: TaskType.TODO, title: 'Original', priority: TaskPriority.LOW, assigneeIds: [], isPersonal: false },
        userContext
      );

      const updated = await service.update(
        task.id,
        { title: 'Updated', priority: TaskPriority.HIGH },
        userContext
      );

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe(TaskPriority.HIGH);
    });

    it('should soft delete (archive) task', async () => {
      const task = await service.create(
        { type: TaskType.TODO, title: 'To delete', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      await service.delete(task.id, userContext);

      const archived = await service.findById(task.id, userContext);
      expect(archived.status).toBe(TaskStatus.ARCHIVED);
    });

    it('should only allow creator or manager to delete', async () => {
      const task = await service.create(
        { type: TaskType.TODO, title: 'Protected', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const otherUserContext: TaskPermissionContext = {
        ...userContext,
        userId: OTHER_USER_ID,
      };

      await expect(service.delete(task.id, otherUserContext)).rejects.toThrow(
        'Only task creator or manager can delete'
      );
    });
  });

  // =====================================================
  // Additional Tests: Due Date Filtering
  // =====================================================
  describe('Due Date Filtering', () => {
    it('should filter tasks by dueDateFrom', async () => {
      await service.create(
        { type: TaskType.TODO, title: 'Early task', dueDate: new Date('2026-01-10'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Later task', dueDate: new Date('2026-01-20'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'No due date task', priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const filter: TaskFilterDto = { dueDateFrom: new Date('2026-01-15'), page: 1, pageSize: 20 };
      const result = await service.findMany(filter, userContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.title).toBe('Later task');
    });

    it('should filter tasks by dueDateTo', async () => {
      await service.create(
        { type: TaskType.TODO, title: 'Early task', dueDate: new Date('2026-01-10'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Later task', dueDate: new Date('2026-01-20'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const filter: TaskFilterDto = { dueDateTo: new Date('2026-01-15'), page: 1, pageSize: 20 };
      const result = await service.findMany(filter, userContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.title).toBe('Early task');
    });

    it('should filter tasks by date range (dueDateFrom and dueDateTo)', async () => {
      await service.create(
        { type: TaskType.TODO, title: 'Too early', dueDate: new Date('2026-01-05'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'In range', dueDate: new Date('2026-01-15'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );
      await service.create(
        { type: TaskType.TODO, title: 'Too late', dueDate: new Date('2026-01-25'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const filter: TaskFilterDto = {
        dueDateFrom: new Date('2026-01-10'),
        dueDateTo: new Date('2026-01-20'),
        page: 1,
        pageSize: 20
      };
      const result = await service.findMany(filter, userContext);

      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.title).toBe('In range');
    });

    it('should count overdue tasks in statistics', async () => {
      // Create an overdue task (due date in the past)
      await service.create(
        { type: TaskType.TODO, title: 'Overdue task', dueDate: new Date('2020-01-01'), priority: TaskPriority.HIGH, assigneeIds: [], isPersonal: false },
        userContext
      );
      // Create a future task
      await service.create(
        { type: TaskType.TODO, title: 'Future task', dueDate: new Date('2030-01-01'), priority: TaskPriority.MEDIUM, assigneeIds: [], isPersonal: false },
        userContext
      );

      const stats = await service.getStatistics(userContext);

      expect(stats.overdueTasks).toBe(1);
    });
  });
});
