import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TodosService } from '@/modules/todos/todos.service';
import { CreateTodoDto } from '@/modules/todos/dto/create-todo.dto';
import { UpdateTodoDto } from '@/modules/todos/dto/update-todo.dto';
import { QueryTodoDto } from '@/modules/todos/dto/query-todo.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  TodoResponseDto,
  TodoListResponseDto,
} from '@/modules/todos/dto/todo-response.dto';
import { 
  ErrorResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  NotFoundErrorResponseDto
} from '@/common/dto/error-response.dto';
import type { JwtUser } from '@/common/types';

/**
 * Controller xử lý các HTTP requests cho module Todos
 * Tất cả endpoints đều yêu cầu xác thực JWT
 */
@ApiTags('Todos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Bảo vệ tất cả endpoints bằng JWT authentication
@Controller('todos') // Base route: /todos
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  /**
   * POST /todos
   * Tạo todo mới
   * @param user - Thông tin user từ JWT token (tự động inject bởi @CurrentUser())
   * @param dto - Dữ liệu để tạo todo (từ request body)
   * @returns Todo đã được tạo
   */
  @ApiOperation({ summary: 'Create a new todo' })
  @ApiBody({ type: CreateTodoDto })
  @ApiResponse({
    status: 201,
    description: 'Todo created successfully',
    type: TodoResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input data',
    type: ValidationErrorResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateTodoDto) {
    return this.todosService.createTodo(user, dto);
  }

  /**
   * GET /todos
   * Lấy danh sách todos với phân trang và filter
   * @param user - Thông tin user từ JWT token
   * @param query - Các tham số query (page, limit, isDone) từ URL
   * @returns Object chứa danh sách todos, tổng số, trang hiện tại, limit
   *
   * Ví dụ: GET /todos?page=2&limit=10&isDone=true
   */
  @ApiOperation({ summary: 'Get all todos with pagination and filtering' })
  @ApiQuery({ type: QueryTodoDto })
  @ApiResponse({
    status: 200,
    description: 'Todos retrieved successfully',
    type: TodoListResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: QueryTodoDto) {
    return this.todosService.findAllTodos(user, query);
  }

  /**
   * GET /todos/:id
   * Lấy thông tin chi tiết một todo theo ID
   * @param user - Thông tin user từ JWT token
   * @param id - ID của todo (tự động convert string thành number bởi ParseIntPipe)
   * @returns Todo entity
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền truy cập
   *
   * Ví dụ: GET /todos/123
   */
  @ApiOperation({ summary: 'Get a specific todo by ID' })
  @ApiParam({ name: 'id', description: 'Todo ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Todo retrieved successfully',
    type: TodoResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Access denied',
    type: ForbiddenErrorResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Todo not found',
    type: NotFoundErrorResponseDto
  })
  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.todosService.findOneTodo(id, user);
  }

  /**
   * PATCH /todos/:id
   * Cập nhật thông tin todo
   * @param user - Thông tin user từ JWT token
   * @param id - ID của todo cần cập nhật
   * @param dto - Dữ liệu cập nhật (từ request body)
   * @returns Todo đã được cập nhật
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền cập nhật
   *
   * Ví dụ: PATCH /todos/123 với body: { "title": "New title", "isDone": true }
   */
  @ApiOperation({ summary: 'Update a todo' })
  @ApiParam({ name: 'id', description: 'Todo ID', example: 1 })
  @ApiBody({ type: UpdateTodoDto })
  @ApiResponse({
    status: 200,
    description: 'Todo updated successfully',
    type: TodoResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input data',
    type: ValidationErrorResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Access denied',
    type: ForbiddenErrorResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Todo not found',
    type: NotFoundErrorResponseDto
  })
  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todosService.updateTodo(id, user, dto);
  }

  /**
   * DELETE /todos/:id
   * Xóa todo
   * @param user - Thông tin user từ JWT token
   * @param id - ID của todo cần xóa
   * @returns Object thông báo xóa thành công
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền xóa
   *
   * Ví dụ: DELETE /todos/123
   */
  @ApiOperation({ summary: 'Delete a todo' })
  @ApiParam({ name: 'id', description: 'Todo ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Todo deleted successfully',
    type: TodoResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Access denied',
    type: ForbiddenErrorResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Todo not found',
    type: NotFoundErrorResponseDto
  })
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.todosService.removeTodo(id, user);
  }
}
