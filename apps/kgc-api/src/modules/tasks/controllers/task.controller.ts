/**
 * Task Controller - REST API for Task Management
 * Epic 12: Feladatlista Widget
 *
 * Endpoints:
 * - GET    /tasks          - List tasks with filters
 * - GET    /tasks/:id      - Get task by ID
 * - POST   /tasks          - Create new task
 * - PATCH  /tasks/:id      - Update task
 * - DELETE /tasks/:id      - Soft delete task
 * - PATCH  /tasks/:id/status - Change task status
 * - PATCH  /tasks/:id/complete - Mark task as completed
 * - GET    /tasks/shopping-list - Get shopping list for location
 * - GET    /tasks/assigned  - Get tasks assigned to user
 * - GET    /tasks/overdue   - Get overdue tasks
 * - GET    /tasks/stats     - Get task statistics
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateTaskInput,
  PrismaTaskRepository,
  Task,
  TaskQuery,
  TaskQueryResult,
  TaskStatus,
  TaskType,
  UpdateTaskInput,
} from '../repositories/prisma-task.repository';

// ============================================
// DTOs for Swagger
// ============================================

class CreateTaskDto {
  tenantId!: string;
  locationId!: string;
  type!: TaskType;
  title!: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds?: string[];
  isPrivate?: boolean;
  dueDate?: string;
  priority?: number;
  worksheetId?: string;
  createdBy!: string;
}

class UpdateTaskDto {
  title?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds?: string[];
  dueDate?: string;
  priority?: number;
}

class ChangeStatusDto {
  status!: TaskStatus;
  userId!: string;
}

class CompleteTaskDto {
  userId!: string;
}

class AssignUsersDto {
  userIds!: string[];
}

// ============================================
// CONTROLLER
// ============================================

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskRepository: PrismaTaskRepository) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List tasks with filters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['SHOPPING', 'TODO', 'NOTE', 'MESSAGE'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Task list with pagination' })
  async list(
    @Query('tenantId') tenantId: string,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
    @Query('locationId') locationId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('createdBy') createdBy?: string,
    @Query('search') search?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ): Promise<TaskQueryResult> {
    const query: TaskQuery = {
      tenantId,
    };

    if (type) query.type = type;
    if (status) query.status = status;
    if (locationId) query.locationId = locationId;
    if (assignedToId) query.assignedToId = assignedToId;
    if (createdBy) query.createdBy = createdBy;
    if (search) query.search = search;
    if (offset) query.offset = parseInt(offset, 10);
    if (limit) query.limit = parseInt(limit, 10);

    return this.taskRepository.query(query);
  }

  @Get('shopping-list')
  @ApiOperation({ summary: 'Get shopping list items for a location' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @ApiResponse({ status: 200, description: 'Shopping list items' })
  async getShoppingList(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('status') status?: TaskStatus
  ): Promise<Task[]> {
    return this.taskRepository.getShoppingList(
      tenantId,
      locationId,
      status ? { status } : undefined
    );
  }

  @Get('assigned')
  @ApiOperation({ summary: 'Get tasks assigned to a user' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Assigned tasks' })
  async getAssignedTasks(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('status') status?: TaskStatus,
    @Query('type') type?: TaskType
  ): Promise<Task[]> {
    const options: { status?: TaskStatus; type?: TaskType } = {};
    if (status) options.status = status;
    if (type) options.type = type;

    return this.taskRepository.getAssignedTasks(
      tenantId,
      userId,
      Object.keys(options).length > 0 ? options : undefined
    );
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Overdue tasks' })
  async getOverdueTasks(@Query('tenantId') tenantId: string): Promise<Task[]> {
    return this.taskRepository.getOverdueTasks(tenantId);
  }

  @Get('private-notes')
  @ApiOperation({ summary: 'Get personal private notes' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Private notes' })
  async getPrivateNotes(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<Task[]> {
    return this.taskRepository.getPrivateNotes(tenantId, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiResponse({ status: 200, description: 'Task statistics' })
  async getStats(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string
  ): Promise<{
    byStatus: Record<TaskStatus, number>;
    byType: Record<TaskType, number>;
  }> {
    const [byStatus, byType] = await Promise.all([
      this.taskRepository.countByStatus(tenantId, locationId),
      this.taskRepository.countByType(tenantId),
    ]);

    return { byStatus, byType };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getById(
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string
  ): Promise<Task | null> {
    return this.taskRepository.findById(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(@Body() dto: CreateTaskDto): Promise<Task> {
    const input: CreateTaskInput = {
      tenantId: dto.tenantId,
      locationId: dto.locationId,
      type: dto.type,
      title: dto.title,
      createdBy: dto.createdBy,
    };

    if (dto.description !== undefined) input.description = dto.description;
    if (dto.quantity !== undefined) input.quantity = dto.quantity;
    if (dto.unit !== undefined) input.unit = dto.unit;
    if (dto.assignedToIds !== undefined) input.assignedToIds = dto.assignedToIds;
    if (dto.isPrivate !== undefined) input.isPrivate = dto.isPrivate;
    if (dto.dueDate !== undefined) input.dueDate = new Date(dto.dueDate);
    if (dto.priority !== undefined) input.priority = dto.priority as 0 | 1 | 2;
    if (dto.worksheetId !== undefined) input.worksheetId = dto.worksheetId;

    return this.taskRepository.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateTaskDto
  ): Promise<Task> {
    const input: UpdateTaskInput = {};

    if (dto.title !== undefined) input.title = dto.title;
    if (dto.description !== undefined) input.description = dto.description;
    if (dto.quantity !== undefined) input.quantity = dto.quantity;
    if (dto.unit !== undefined) input.unit = dto.unit;
    if (dto.assignedToIds !== undefined) input.assignedToIds = dto.assignedToIds;
    if (dto.dueDate !== undefined) input.dueDate = new Date(dto.dueDate);
    if (dto.priority !== undefined) input.priority = dto.priority as 0 | 1 | 2;

    return this.taskRepository.update(id, tenantId, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  async delete(@Param('id') id: string, @Query('tenantId') tenantId: string): Promise<void> {
    await this.taskRepository.softDelete(id, tenantId);
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change task status' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: ChangeStatusDto })
  @ApiResponse({ status: 200, description: 'Status changed' })
  async changeStatus(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: ChangeStatusDto
  ): Promise<Task> {
    return this.taskRepository.updateStatus(id, tenantId, dto.status, dto.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark task as completed' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: CompleteTaskDto })
  @ApiResponse({ status: 200, description: 'Task completed' })
  async complete(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: CompleteTaskDto
  ): Promise<Task> {
    return this.taskRepository.complete(id, tenantId, dto.userId);
  }

  // ============================================
  // ASSIGNMENT OPERATIONS
  // ============================================

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign users to task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: AssignUsersDto })
  @ApiResponse({ status: 200, description: 'Users assigned' })
  async assignUsers(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: AssignUsersDto
  ): Promise<Task> {
    return this.taskRepository.assignUsers(id, tenantId, dto.userIds);
  }

  @Patch(':id/unassign')
  @ApiOperation({ summary: 'Remove users from task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: AssignUsersDto })
  @ApiResponse({ status: 200, description: 'Users removed' })
  async unassignUsers(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: AssignUsersDto
  ): Promise<Task> {
    return this.taskRepository.unassignUsers(id, tenantId, dto.userIds);
  }
}
