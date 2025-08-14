import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoEntity } from '@/modules/todos/entities/todo.entity';
import { CreateTodoDto } from '@/modules/todos/dto/create-todo.dto';
import { UpdateTodoDto } from '@/modules/todos/dto/update-todo.dto';
import { QueryTodoDto } from '@/modules/todos/dto/query-todo.dto';

/**
 * Kiểu dữ liệu cho user từ JWT token
 * Chứa thông tin id, username và role của user đang đăng nhập
 */
type JwtUser = { id: number; username: string; role: 'user'|'admin' };

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
   * Lấy danh sách todos với phân trang và filter
   * @param user - Thông tin user đang truy vấn
   * @param query - Các tham số query (page, limit, isDone)
   * @returns Object chứa danh sách todos, tổng số, trang hiện tại, limit
   */
  async findAllTodos(user: JwtUser, query: QueryTodoDto) {
    // Xử lý phân trang
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit; // Tính số ghi cần bỏ qua

    // Xây dựng điều kiện where cho query
    const where: any = {};
    
    // Lọc theo trạng thái isDone nếu có
    if (query.isDone !== undefined) {
      where.isDone = query.isDone === 'true'; // Chuyển đổi string "true"/"false" thành boolean
    }

    // Phân quyền: admin thấy tất cả, user chỉ thấy của mình
    if (user.role !== 'admin') {
      where.ownerId = user.id;
    }

    // Thực hiện query với phân trang
    const [items, total] = await this.todoRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' }, // Sắp xếp theo thời gian tạo mới nhất
      skip,
      take: limit,
    });

    return {
      items, // Danh sách todos
      total, // Tổng số todos
      page,  // Trang hiện tại
      limit, // Số items trên mỗi trang
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
