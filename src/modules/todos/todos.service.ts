import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { TodoEntity } from '@/modules/todos/entities/todo.entity';
import { CreateTodoDto } from '@/modules/todos/dto/create-todo.dto';
import { UpdateTodoDto } from '@/modules/todos/dto/update-todo.dto';
import { QueryTodoDto } from '@/modules/todos/dto/query-todo.dto';
import type { JwtUser } from '@/common/types';
import { CustomLogger } from '@/common/logger/custom-logger.service';

/**
 * TodosService - Service xử lý logic nghiệp vụ cho module Todos
 *
 * Service này chịu trách nhiệm:
 * - CRUD Operations: Tạo, đọc, cập nhật, xóa todos
 * - Authorization: Phân quyền truy cập (admin vs user)
 * - Business Logic: Pagination, filtering, sorting, search
 * - Data Validation: Kiểm tra dữ liệu đầu vào
 * - Logging: Ghi log tất cả operations để audit trail
 *
 * Dependencies:
 * - TodoEntity Repository: Tương tác với database
 * - CustomLogger: Ghi log operations
 *
 * Security Features:
 * - Role-based access control (RBAC)
 * - User isolation (user chỉ thấy todos của mình)
 * - Admin privileges (admin thấy tất cả todos)
 *
 * @description
 * Đây là service chính xử lý tất cả business logic liên quan đến todos
 * Tuân thủ nguyên tắc: Service xử lý business logic + logging
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
    private readonly logger: CustomLogger, // Custom logger cho todos operations
  ) {}

  /**
   * Tạo todo mới cho user
   *
   * Flow xử lý:
   * 1. Log bắt đầu quá trình tạo todo
   * 2. Tạo TodoEntity instance từ DTO data
   * 3. Gán ownerId = user.id (user hiện tại sở hữu todo)
   * 4. Lưu todo vào database
   * 5. Log thành công và trả về todo đã tạo
   *
   * Security:
   * - Todo tự động được gán cho user hiện tại (ownerId)
   * - Không thể tạo todo cho user khác
   *
   * @param owner - Thông tin user đang tạo todo (từ JWT token)
   * @param dto - Dữ liệu để tạo todo (title, description, isDone)
   * @returns Todo đã được tạo và lưu vào database
   *
   * @example
   * const todo = await todosService.createTodo(user, {
   *   title: "Học NestJS",
   *   description: "Học về dependency injection",
   *   isDone: false
   * });
   */
  async createTodo(owner: JwtUser, dto: CreateTodoDto) {
    this.logger.log(`Creating todo for user: ${owner.username} (ID: ${owner.id})`);

    // Tạo instance mới của TodoEntity với dữ liệu từ DTO
    const todo = this.todoRepository.create({
      title: dto.title,
      description: dto.description,
      isDone: dto.isDone ?? false, // Mặc định là false nếu không truyền
      ownerId: owner.id, // Gán owner là user hiện tại
    });

    const savedTodo = await this.todoRepository.save(todo);
    this.logger.log(`Todo created successfully: ${savedTodo.title} (ID: ${savedTodo.id})`);

    return savedTodo;
  }

  /**
   * Lấy danh sách todos với phân trang, filtering và sorting nâng cao
   *
   * Đây là method phức tạp nhất, hỗ trợ nhiều tính năng:
   *
   * 1. Pagination (Phân trang):
   *    - page: Trang hiện tại (mặc định: 1)
   *    - limit: Số items/trang (mặc định: 10, max: 100)
   *
   * 2. Filtering (Lọc dữ liệu):
   *    - isDone: Lọc theo trạng thái hoàn thành (true/false)
   *    - search: Tìm kiếm trong title và description (case-insensitive)
   *    - dateFrom/dateTo: Lọc theo khoảng thời gian tạo
   *
   * 3. Sorting (Sắp xếp):
   *    - sortBy: Sắp xếp theo field (id, title, isDone, createdAt, updatedAt)
   *    - sortOrder: Thứ tự sắp xếp (asc/desc)
   *
   * 4. Authorization (Phân quyền):
   *    - Admin: Thấy tất cả todos của mọi user
   *    - User: Chỉ thấy todos của chính mình
   *
   * Flow xử lý:
   * 1. Log debug với query parameters
   * 2. Xây dựng pagination parameters
   * 3. Xây dựng WHERE conditions (filtering + authorization)
   * 4. Xây dựng ORDER BY conditions (sorting)
   * 5. Thực hiện query với findAndCount
   * 6. Xây dựng metadata và trả về kết quả
   *
   * @param user - Thông tin user đang truy vấn (từ JWT token)
   * @param query - Các tham số query với đầy đủ filter options
   * @returns Object chứa danh sách todos, metadata pagination và filters applied
   *
   * @example
   * // Cơ bản
   * const result = await todosService.findAllTodos(user, { page: 1, limit: 10 });
   *
   * // Với filtering
   * const result = await todosService.findAllTodos(user, {
   *   page: 1,
   *   limit: 20,
   *   isDone: 'true',
   *   search: 'typescript',
   *   dateFrom: '2024-01-01T00:00:00.000Z',
   *   sortBy: 'createdAt',
   *   sortOrder: 'desc'
   * });
   */
  async findAllTodos(user: JwtUser, query: QueryTodoDto) {
    this.logger.debug?.(
      `Finding todos for user: ${user.username} (ID: ${user.id}) with query: ${JSON.stringify(query)}`,
    );

    const { page, limit, skip } = this.buildPaginationParams(query);
    const whereClause = this.buildWhereConditions(user, query);
    const orderClause = this.buildOrderClause(query);

    const [todos, total] = await this.todoRepository.findAndCount({
      where: whereClause,
      order: orderClause,
      skip,
      take: limit,
    });

    this.logger.log(`Found ${todos.length} todos for user: ${user.username} (total: ${total})`);

    return {
      todos,
      pagination: this.buildPaginationMetadata(page, limit, total),
      filters: this.buildFiltersMetadata(query),
    };
  }

  /**
   * Xây dựng parameters cho pagination
   *
   * Helper method để tính toán các tham số pagination:
   * - page: Đảm bảo >= 1
   * - limit: Đảm bảo 1 <= limit <= 100 (giới hạn max để tránh performance issues)
   * - skip: Số records cần bỏ qua = (page - 1) * limit
   *
   * @param query - Query parameters từ request
   * @returns Object chứa page, limit, skip đã được validate
   */
  private buildPaginationParams(query: QueryTodoDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Xây dựng điều kiện WHERE cho query
   *
   * Helper method để xây dựng WHERE conditions cho TypeORM query.
   * Kết hợp nhiều loại filter:
   *
   * 1. Authorization Filter:
   *    - Admin: Không có filter (thấy tất cả)
   *    - User: Chỉ thấy todos có ownerId = user.id
   *
   * 2. Status Filter (isDone):
   *    - Lọc theo trạng thái hoàn thành (true/false)
   *
   * 3. Date Range Filter:
   *    - dateFrom: Từ ngày nào
   *    - dateTo: Đến ngày nào
   *
   * 4. Search Filter:
   *    - Tìm kiếm trong title và description
   *
   * Logic kết hợp:
   * - Nếu có cả filter và search: Kết hợp với AND và OR
   * - Nếu chỉ có filter: Chỉ áp dụng filter
   * - Nếu chỉ có search: Chỉ áp dụng search
   * - Nếu không có gì: Trả về empty object (không filter)
   *
   * @param user - User đang truy vấn (để check authorization)
   * @param query - Query parameters từ request
   * @returns WHERE conditions object cho TypeORM
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
   *
   * Helper method để tạo date range filter cho TypeORM.
   * Sử dụng Between operator để lọc todos theo khoảng thời gian tạo.
   *
   * Logic:
   * - Nếu có dateFrom: Lọc từ dateFrom đến dateTo (hoặc hiện tại nếu không có dateTo)
   * - Nếu chỉ có dateTo: Lọc từ epoch (1970-01-01) đến dateTo
   * - Nếu không có gì: Trả về empty object (không filter)
   *
   * @param dateFrom - Ngày bắt đầu (ISO string)
   * @param dateTo - Ngày kết thúc (ISO string)
   * @returns Date filter object cho TypeORM Between operator
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
   *
   * Helper method để tạo search conditions cho TypeORM.
   * Sử dụng LIKE operator để tìm kiếm trong title và description.
   *
   * Logic:
   * - Thêm % vào đầu và cuối search term để tìm kiếm partial match
   * - Tìm kiếm trong cả title và description (OR condition)
   * - Case-insensitive search (tùy thuộc vào database collation)
   * - Trả về array với 2 conditions: title LIKE và description LIKE
   *
   * @param search - Search term từ query parameter
   * @returns Array chứa search conditions cho title và description
   */
  private buildSearchConditions(search?: string) {
    if (!search) return [];

    const searchTerm = `%${search}%`;
    return [{ title: Like(searchTerm) }, { description: Like(searchTerm) }];
  }

  /**
   * Kết hợp các điều kiện WHERE
   *
   * Helper method để kết hợp filter conditions và search conditions.
   * Đây là logic phức tạp để tạo ra WHERE clause chính xác cho TypeORM.
   *
   * Logic kết hợp:
   *
   * 1. Có cả filter và search:
   *    - Tạo ra 2 conditions: filter + title search VÀ filter + description search
   *    - TypeORM sẽ hiểu là: (filter AND title_search) OR (filter AND description_search)
   *
   * 2. Chỉ có filter:
   *    - Nếu 1 filter: Trả về filter object
   *    - Nếu nhiều filter: Trả về array của filters (AND condition)
   *
   * 3. Chỉ có search:
   *    - Trả về array với title search và description search (OR condition)
   *
   * 4. Không có gì:
   *    - Trả về empty object (không filter)
   *
   * @param whereConditions - Array các filter conditions (authorization, status, date)
   * @param searchConditions - Array các search conditions (title, description)
   * @returns Combined WHERE conditions cho TypeORM
   */
  private combineWhereConditions(whereConditions: any[], searchConditions: any[]) {
    if (whereConditions.length > 0 && searchConditions.length > 0) {
      // Có cả filter và search - kết hợp với AND và OR
      return [
        ...whereConditions.map((condition) => ({
          ...condition,
          ...searchConditions[0],
        })),
        ...whereConditions.map((condition) => ({
          ...condition,
          ...searchConditions[1],
        })),
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
   *
   * Helper method để tạo ORDER BY clause cho TypeORM query.
   * Hỗ trợ sorting theo các field được phép và validate input.
   *
   * Features:
   * - Default sorting: createdAt DESC (mới nhất lên đầu)
   * - Allowed fields: id, title, isDone, createdAt, updatedAt
   * - Sort order: asc (tăng dần) hoặc desc (giảm dần)
   * - Input validation: Throw BadRequestException nếu field không hợp lệ
   *
   * Security:
   * - Chỉ cho phép sort theo các field được định nghĩa trước
   * - Tránh SQL injection bằng cách validate input
   *
   * @param query - Query parameters từ request
   * @returns ORDER BY object cho TypeORM
   * @throws BadRequestException nếu sortBy field không hợp lệ
   */
  private buildOrderClause(query: QueryTodoDto) {
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Validate sortBy field
    const allowedSortFields = ['id', 'title', 'isDone', 'createdAt', 'updatedAt'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sort field: ${sortBy}. Allowed fields: ${allowedSortFields.join(', ')}`,
      );
    }

    return { [sortBy]: sortOrder.toUpperCase() };
  }

  /**
   * Xây dựng metadata pagination
   *
   * Helper method để tạo pagination metadata cho response.
   * Cung cấp thông tin chi tiết về pagination để client có thể hiển thị UI.
   *
   * Metadata bao gồm:
   * - page: Trang hiện tại
   * - limit: Số items/trang
   * - total: Tổng số records
   * - totalPages: Tổng số trang
   * - hasNextPage: Có trang tiếp theo không
   * - hasPrevPage: Có trang trước không
   *
   * @param page - Trang hiện tại
   * @param limit - Số items/trang
   * @param total - Tổng số records từ database
   * @returns Pagination metadata object
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
   *
   * Helper method để tạo filters metadata cho response.
   * Trả về thông tin về các filters đã được áp dụng để client có thể hiển thị UI.
   *
   * Metadata bao gồm:
   * - isDone: Trạng thái filter đã áp dụng
   * - search: Search term đã sử dụng
   * - dateFrom/dateTo: Khoảng thời gian đã filter
   * - sortBy/sortOrder: Thông tin sorting đã áp dụng
   *
   * @param query - Query parameters từ request
   * @returns Filters metadata object
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
   *
   * Flow xử lý:
   * 1. Log debug với todo ID và user info
   * 2. Tìm todo trong database theo ID
   * 3. Kiểm tra todo có tồn tại không
   * 4. Kiểm tra quyền truy cập (authorization)
   * 5. Log thành công và trả về todo
   *
   * Security:
   * - Kiểm tra todo có tồn tại không (404 Not Found)
   * - Kiểm tra quyền truy cập (403 Forbidden)
   * - Admin có thể truy cập tất cả todos
   * - User chỉ có thể truy cập todos của mình
   *
   * @param id - ID của todo cần lấy
   * @param user - Thông tin user đang truy vấn (từ JWT token)
   * @returns Todo entity với đầy đủ thông tin
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền truy cập
   *
   * @example
   * const todo = await todosService.findOneTodo(123, user);
   * console.log(todo.title); // "Học NestJS"
   */
  async findOneTodo(id: number, user: JwtUser) {
    this.logger.debug?.(`Finding todo ID: ${id} for user: ${user.username} (ID: ${user.id})`);

    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      this.logger.warn(`Todo not found: ID ${id} requested by user: ${user.username}`);
      throw new NotFoundException('Todo not found');
    }

    // Kiểm tra quyền truy cập
    this.assertCanAccess(todo, user);

    this.logger.log(`Todo found: ${todo.title} (ID: ${todo.id}) for user: ${user.username}`);
    return todo;
  }

  /**
   * Cập nhật thông tin todo
   *
   * Flow xử lý:
   * 1. Log bắt đầu quá trình update
   * 2. Tìm todo trong database theo ID
   * 3. Kiểm tra todo có tồn tại không
   * 4. Kiểm tra quyền truy cập (authorization)
   * 5. Cập nhật dữ liệu từ DTO vào entity
   * 6. Lưu todo đã cập nhật vào database
   * 7. Log thành công và trả về todo đã update
   *
   * Security:
   * - Kiểm tra todo có tồn tại không (404 Not Found)
   * - Kiểm tra quyền truy cập (403 Forbidden)
   * - Admin có thể update tất cả todos
   * - User chỉ có thể update todos của mình
   *
   * Features:
   * - Partial update: Chỉ update các field được cung cấp trong DTO
   * - Preserve existing data: Các field không có trong DTO giữ nguyên
   * - Validation: DTO validation đã được xử lý ở Controller level
   *
   * @param id - ID của todo cần cập nhật
   * @param user - Thông tin user đang cập nhật (từ JWT token)
   * @param dto - Dữ liệu cập nhật (có thể partial - chỉ một số field)
   * @returns Todo đã được cập nhật với dữ liệu mới
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền cập nhật
   *
   * @example
   * const updatedTodo = await todosService.updateTodo(123, user, {
   *   title: "Học NestJS Advanced",
   *   isDone: true
   * });
   */
  async updateTodo(id: number, user: JwtUser, dto: UpdateTodoDto) {
    this.logger.log(`Updating todo ID: ${id} for user: ${user.username} (ID: ${user.id})`);

    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      this.logger.warn(`Todo not found for update: ID ${id} requested by user: ${user.username}`);
      throw new NotFoundException('Todo not found');
    }

    // Kiểm tra quyền truy cập
    this.assertCanAccess(todo, user);

    // Cập nhật dữ liệu từ DTO vào entity
    Object.assign(todo, dto);
    const updatedTodo = await this.todoRepository.save(todo);

    this.logger.log(
      `Todo updated successfully: ${updatedTodo.title} (ID: ${updatedTodo.id}) by user: ${user.username}`,
    );
    return updatedTodo;
  }

  /**
   * Xóa todo
   *
   * Flow xử lý:
   * 1. Log bắt đầu quá trình xóa
   * 2. Tìm todo trong database theo ID
   * 3. Kiểm tra todo có tồn tại không
   * 4. Kiểm tra quyền truy cập (authorization)
   * 5. Xóa todo khỏi database (soft delete hoặc hard delete tùy config)
   * 6. Log thành công và trả về confirmation
   *
   * Security:
   * - Kiểm tra todo có tồn tại không (404 Not Found)
   * - Kiểm tra quyền truy cập (403 Forbidden)
   * - Admin có thể xóa tất cả todos
   * - User chỉ có thể xóa todos của mình
   *
   * Features:
   * - Permanent deletion: Todo sẽ bị xóa vĩnh viễn khỏi database
   * - Cascade effects: Có thể ảnh hưởng đến các related data (nếu có)
   * - Audit trail: Log đầy đủ thông tin về việc xóa để tracking
   *
   * @param id - ID của todo cần xóa
   * @param user - Thông tin user đang xóa (từ JWT token)
   * @returns Object thông báo xóa thành công { deleted: true }
   * @throws NotFoundException nếu không tìm thấy todo
   * @throws ForbiddenException nếu user không có quyền xóa
   *
   * @example
   * const result = await todosService.removeTodo(123, user);
   * console.log(result); // { deleted: true }
   */
  async removeTodo(id: number, user: JwtUser) {
    this.logger.log(`Removing todo ID: ${id} for user: ${user.username} (ID: ${user.id})`);

    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      this.logger.warn(`Todo not found for deletion: ID ${id} requested by user: ${user.username}`);
      throw new NotFoundException('Todo not found');
    }

    // Kiểm tra quyền truy cập
    this.assertCanAccess(todo, user);

    // Xóa todo khỏi database
    await this.todoRepository.remove(todo);

    this.logger.log(
      `Todo deleted successfully: ${todo.title} (ID: ${todo.id}) by user: ${user.username}`,
    );
    return { deleted: true };
  }

  /**
   * Kiểm tra quyền truy cập todo (Authorization Logic)
   *
   * Private helper method để kiểm tra quyền truy cập todo.
   * Được sử dụng bởi tất cả các methods cần authorization.
   *
   * Authorization Rules:
   * 1. Admin Role: Có quyền truy cập tất cả todos của mọi user
   * 2. User Role: Chỉ có quyền truy cập todos có ownerId = user.id
   *
   * Flow xử lý:
   * 1. Kiểm tra user role
   * 2. Nếu admin: Cho phép truy cập, log debug
   * 3. Nếu user: Kiểm tra ownerId
   * 4. Nếu ownerId khớp: Cho phép truy cập, log debug
   * 5. Nếu ownerId không khớp: Từ chối, log warning, throw ForbiddenException
   *
   * Security Features:
   * - Role-based access control (RBAC)
   * - User isolation (data segregation)
   * - Comprehensive logging cho audit trail
   * - Clear error messages cho security violations
   *
   * @param todo - Todo entity cần kiểm tra quyền truy cập
   * @param user - User đang thực hiện thao tác (từ JWT token)
   * @throws ForbiddenException nếu user không có quyền truy cập
   *
   * @example
   * // Trong findOneTodo method:
   * const todo = await this.todoRepository.findOne({ where: { id } });
   * this.assertCanAccess(todo, user); // Kiểm tra quyền truy cập
   * return todo;
   */
  private assertCanAccess(todo: TodoEntity, user: JwtUser) {
    // Admin có quyền truy cập tất cả
    if (user.role === 'admin') {
      this.logger.debug?.(`Admin access granted for todo: ${todo.title} (ID: ${todo.id})`);
      return;
    }

    // User chỉ có thể truy cập todos của mình
    if (todo.ownerId !== user.id) {
      this.logger.warn(
        `Access denied: User ${user.username} (ID: ${user.id}) tried to access todo ${todo.title} (ID: ${todo.id}) owned by user ID: ${todo.ownerId}`,
      );
      throw new ForbiddenException('You are not allowed to access this resource');
    }

    this.logger.debug?.(`User access granted for todo: ${todo.title} (ID: ${todo.id})`);
  }
}
