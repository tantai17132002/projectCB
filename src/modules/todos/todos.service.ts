import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { TodoEntity } from '@/modules/todos/entities/todo.entity';
import { CreateTodoDto } from '@/modules/todos/dto/create-todo.dto';
import { UpdateTodoDto } from '@/modules/todos/dto/update-todo.dto';
import { QueryTodoDto } from '@/modules/todos/dto/query-todo.dto';
import type { JwtUser } from '@/common/types';

/**
 * Service xử lý logic nghiệp vụ cho module Todos
 * Quản lý các hoạt động CRUD và phân quyền truy cập
 */
@Injectable()
export class TodosService {
  constructor(
    /**
     * Inject repository của TodoEntity để tương tác với database
     * @InjectRepository(TodoEntity) - Decorator để inject repository
     */
    @InjectRepository(TodoEntity)
    private readonly todoRepository: Repository<TodoEntity>,
  ) {}

  /**
   * Tạo todo mới
   * @param owner - Thông tin user đang tạo todo
   * @param dto - Dữ liệu để tạo todo
   * @returns Todo đã được tạo và lưu vào database
   */
  async createTodo(owner: JwtUser, dto: CreateTodoDto) {
    // Tạo instance mới của TodoEntity với dữ liệu từ DTO
    const todo = this.todoRepository.create({
      title: dto.title,
      description: dto.description,
      isDone: dto.isDone ?? false, // Mặc định là false nếu không truyền
      ownerId: owner.id, // Gán owner là user hiện tại
    });
    return this.todoRepository.save(todo);    
  }

  /**
   * Lấy danh sách todos với phân trang, filtering và sorting nâng cao
   * 
   * Hỗ trợ các tính năng:
   * - Pagination: page, limit (max 100 items/page)
   * - Filtering: isDone, search (title/description), dateFrom, dateTo
   * - Sorting: sortBy, sortOrder
   * - Authorization: admin thấy tất cả, user chỉ thấy của mình
   * 
   * @param user - Thông tin user đang truy vấn
   * @param query - Các tham số query với đầy đủ filter options
   * @returns Object chứa danh sách todos, metadata pagination
   */
  async findAllTodos(user: JwtUser, query: QueryTodoDto) {
    const { page, limit, skip } = this.buildPaginationParams(query);
    const whereClause = this.buildWhereConditions(user, query);
    const orderClause = this.buildOrderClause(query);
    
    const [todos, total] = await this.todoRepository.findAndCount({
      where: whereClause,
      order: orderClause,
      skip,
      take: limit,
    });

    return {
      todos,
      pagination: this.buildPaginationMetadata(page, limit, total),
      filters: this.buildFiltersMetadata(query),
    };
  }

  /**
   * Xây dựng parameters cho pagination
   */
  private buildPaginationParams(query: QueryTodoDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  /**
   * Xây dựng điều kiện WHERE cho query
   */
  private buildWhereConditions(user: JwtUser, query: QueryTodoDto) {
    const whereConditions: any[] = [];

    // Phân quyền: admin thấy tất cả, user chỉ thấy của mình
    if (user.role !== 'admin') {
      whereConditions.push({ ownerId: user.id });
    }

    // Filter theo trạng thái isDone
    if (query.isDone !== undefined) {
      const isDoneValue = query.isDone === 'true';
      whereConditions.push({ isDone: isDoneValue });
    }

    // Filter theo ngày tạo
    if (query.dateFrom || query.dateTo) {
      whereConditions.push(this.buildDateFilter(query.dateFrom, query.dateTo));
    }

    // Filter theo search
    const searchConditions = this.buildSearchConditions(query.search);

    return this.combineWhereConditions(whereConditions, searchConditions);
  }

  /**
   * Xây dựng filter theo ngày
   */
  private buildDateFilter(dateFrom?: string, dateTo?: string) {
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.createdAt = Between(new Date(dateFrom), dateTo ? new Date(dateTo) : new Date());
    } else if (dateTo) {
      dateFilter.createdAt = Between(new Date(0), new Date(dateTo));
    }
    return dateFilter;
  }

  /**
   * Xây dựng điều kiện search
   */
  private buildSearchConditions(search?: string) {
    if (!search) return [];
    
    const searchTerm = `%${search}%`;
    return [
      { title: Like(searchTerm) },
      { description: Like(searchTerm) }
    ];
  }

  /**
   * Kết hợp các điều kiện WHERE
   */
  private combineWhereConditions(whereConditions: any[], searchConditions: any[]) {
    if (whereConditions.length > 0 && searchConditions.length > 0) {
      // Có cả filter và search - kết hợp với AND và OR
      return [
        ...whereConditions.map(condition => ({
          ...condition,
          ...searchConditions[0]
        })),
        ...whereConditions.map(condition => ({
          ...condition,
          ...searchConditions[1]
        }))
      ];
    } else if (whereConditions.length > 0) {
      // Chỉ có filter
      return whereConditions.length === 1 ? whereConditions[0] : whereConditions;
    } else if (searchConditions.length > 0) {
      // Chỉ có search
      return searchConditions;
    } else {
      // Không có filter nào
      return {};
    }
  }

  /**
   * Xây dựng điều kiện ORDER BY
   */
  private buildOrderClause(query: QueryTodoDto) {
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    
    // Validate sortBy field
    const allowedSortFields = ['id', 'title', 'isDone', 'createdAt', 'updatedAt'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(`Invalid sort field: ${sortBy}. Allowed fields: ${allowedSortFields.join(', ')}`);
    }

    return { [sortBy]: sortOrder.toUpperCase() };
  }

  /**
   * Xây dựng metadata pagination
   */
  private buildPaginationMetadata(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  /**
   * Xây dựng metadata filters
   */
  private buildFiltersMetadata(query: QueryTodoDto) {
    return {
      isDone: query.isDone,
      search: query.search,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };
  }

  /**
   * Lấy thông tin chi tiết một todo theo ID
   * @param id - ID của todo cần lấy
   * @param user - Thông tin user đang truy vấn
   * @returns Todo entity
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền truy cập
   */
  async findOneTodo(id: number, user: JwtUser) {
    const todo = await this.todoRepository.findOne({ where: { id } });    
    if (!todo) throw new NotFoundException('Todo not found');
    
    // Kiểm tra quyền truy cập
    this.assertCanAccess(todo, user);
    return todo;
  }

  /**
   * Cập nhật thông tin todo
   * @param id - ID của todo cần cập nhật
   * @param user - Thông tin user đang cập nhật
   * @param dto - Dữ liệu cập nhật
   * @returns Todo đã được cập nhật
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền cập nhật
   */
  async updateTodo(id: number, user: JwtUser, dto: UpdateTodoDto) {
    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) throw new NotFoundException('Todo not found');
    
    // Kiểm tra quyền truy cập
    this.assertCanAccess(todo, user);

    // Cập nhật dữ liệu từ DTO vào entity
    Object.assign(todo, dto);
    return this.todoRepository.save(todo);
  }

  /**
   * Xóa todo
   * @param id - ID của todo cần xóa
   * @param user - Thông tin user đang xóa
   * @returns Object thông báo xóa thành công
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền xóa
   */
  async removeTodo(id: number, user: JwtUser) {
    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) throw new NotFoundException('Todo not found');
    
    // Kiểm tra quyền truy cập
    this.assertCanAccess(todo, user);

    // Xóa todo khỏi database
    await this.todoRepository.remove(todo);
    return { deleted: true };
  }

  /**
   * Kiểm tra quyền truy cập todo
   * @param todo - Todo entity cần kiểm tra
   * @param user - User đang thực hiện thao tác
   * @throws ForbiddenException nếu user không có quyền truy cập
   * 
   * Logic phân quyền:
   * - Admin có thể truy cập tất cả todos
   * - User chỉ có thể truy cập todos của chính mình
   */
  private assertCanAccess(todo: TodoEntity, user: JwtUser) {
    // Admin có quyền truy cập tất cả
    if (user.role === 'admin') return;
    
    // User chỉ có thể truy cập todos của mình
    if (todo.ownerId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this resource');
    }
  }
}
