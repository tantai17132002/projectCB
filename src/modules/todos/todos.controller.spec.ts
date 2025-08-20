import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { TodosController } from '@/modules/todos/todos.controller';
import { TodosService } from '@/modules/todos/todos.service';
import { TodoEntity } from '@/modules/todos/entities/todo.entity';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { getRepositoryToken } from '@nestjs/typeorm';

/**
 * Integration Tests cho Todos Controller
 *
 * Đây là loại test tích hợp (Integration Test) để kiểm tra:
 * - Test API thực sự bằng supertest (HTTP requests thật)
 * - Mock database operations để test nhanh (không cần DB thật)
 * - Kiểm tra CRUD operations end-to-end (từ HTTP request đến response)
 * - Test pagination, filtering, sorting (các tính năng query)
 * - Test authorization (User vs Admin - phân quyền)
 * - Test JWT authentication (xác thực token)
 *
 * Khác với Unit Test chỉ test từng function riêng lẻ,
 * Integration Test test toàn bộ flow từ Controller → Service → Database
 */
describe('TodosController (Integration)', () => {
  let app: INestApplication;
  let todosService: TodosService;

  // ===== MOCK DATA (Dữ liệu giả lập) =====
  // Tạo user giả để test authentication và authorization
  const mockUser: UsersEntity = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user', // Role thường để test phân quyền
    createdAt: new Date(),
    updatedAt: new Date(),
    todos: Promise.resolve([]), // Relationship với todos (Promise vì lazy loading)
  } as UsersEntity;

  // Tạo todo giả để test CRUD operations
  const mockTodo: TodoEntity = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    isDone: false, // Trạng thái chưa hoàn thành
    ownerId: 1, // ID của user sở hữu
    owner: mockUser, // Relationship với user
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TodoEntity;

  // Danh sách todos giả để test pagination và filtering
  const mockTodos = [
    { ...mockTodo, id: 1, title: 'Todo 1' },
    { ...mockTodo, id: 2, title: 'Todo 2', isDone: true }, // Todo đã hoàn thành
    { ...mockTodo, id: 3, title: 'Todo 3' },
  ];

  // ===== SETUP TEST MODULE (Thiết lập module test) =====
  beforeAll(async () => {
    // Tạo test module với mocked services (giả lập các service)
    // Đây là cách NestJS tạo môi trường test độc lập
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Cấu hình ConfigModule cho test (để đọc environment variables)
        ConfigModule.forRoot({
          isGlobal: true, // Có thể sử dụng ở mọi nơi trong app
        }),

        // Cấu hình JWT cho test (để tạo và verify tokens)
        JwtModule.register({
          secret: 'test-secret-key', // Secret key để sign JWT
          signOptions: { expiresIn: '1h' }, // Token hết hạn sau 1 giờ
        }),

        PassportModule, // Module cần thiết cho authentication
      ],
      controllers: [TodosController],
      providers: [
        TodosService, // Service thật (không mock) để test logic
        {
          // Mock TodoEntity Repository (giả lập database operations)
          provide: getRepositoryToken(TodoEntity),
          useValue: {
            create: jest.fn(), // Tạo todo mới
            save: jest.fn(), // Lưu todo vào DB
            find: jest.fn(), // Tìm tất cả todos
            findOne: jest.fn(), // Tìm 1 todo theo điều kiện
            update: jest.fn(), // Cập nhật todo
            delete: jest.fn(), // Xóa todo
            // Mock QueryBuilder để test pagination và filtering
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(), // Join với user
              where: jest.fn().mockReturnThis(), // Điều kiện WHERE
              andWhere: jest.fn().mockReturnThis(), // Thêm điều kiện AND
              orderBy: jest.fn().mockReturnThis(), // Sắp xếp
              skip: jest.fn().mockReturnThis(), // Bỏ qua (pagination)
              take: jest.fn().mockReturnThis(), // Lấy bao nhiêu (pagination)
              getManyAndCount: jest.fn().mockResolvedValue([mockTodos, 3]), // Trả về data + count
            })),
          },
        },
        {
          // Mock UsersEntity Repository (giả lập user database operations)
          provide: getRepositoryToken(UsersEntity),
          useValue: {
            findOne: jest.fn(), // Tìm user theo điều kiện
            save: jest.fn(), // Lưu user vào DB
          },
        },
      ],
    })
      // ===== OVERRIDE GUARDS (Ghi đè các guards) =====
      .overrideGuard(JwtAuthGuard)
      .useValue({
        // Mock JWT Authentication Guard
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          const token = request.headers.authorization?.replace('Bearer ', '');

          // Kiểm tra token và set user vào request
          if (token === 'valid-token') {
            request.user = mockUser; // Set user thường
            return true; // Cho phép truy cập
          }
          if (token === 'admin-token') {
            request.user = { ...mockUser, role: 'admin' }; // Set admin user
            return true; // Cho phép truy cập
          }
          return false; // Từ chối truy cập nếu token không hợp lệ
        }),
      })
      .overrideGuard(RolesGuard)
      .useValue({
        // Mock Roles Authorization Guard
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          // Kiểm tra quyền: admin có thể truy cập tất cả, user chỉ truy cập todo của mình
          return (
            request.user?.role === 'admin' || request.user?.id === mockUser.id
          );
        }),
      })
      .compile();

    // ===== CREATE NEST APPLICATION (Tạo ứng dụng NestJS) =====
    app = moduleFixture.createNestApplication();

    // Enable validation pipes để test validation (kiểm tra dữ liệu đầu vào)
    const { ValidationPipe } = require('@nestjs/common');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Chỉ cho phép các field được định nghĩa trong DTO
        forbidNonWhitelisted: true, // Từ chối nếu có field không được định nghĩa
        transform: true, // Tự động convert string sang number/boolean
      }),
    );

    todosService = moduleFixture.get<TodosService>(TodosService); // Lấy service instance
    await app.init(); // Khởi tạo ứng dụng
  });

  // ===== CLEANUP (Dọn dẹp sau khi test xong) =====
  afterAll(async () => {
    await app.close(); // Đóng ứng dụng để giải phóng tài nguyên
  });

  // ===== TEST CRUD OPERATIONS (Test các thao tác CRUD) =====
  describe('POST /todos - Create Todo', () => {
    // Setup trước mỗi test case
    beforeEach(() => {
      // Mock service method để trả về todo đã tạo
      jest.spyOn(todosService, 'createTodo').mockResolvedValue(mockTodo);
    });

    it('should create todo successfully with valid JWT token', async () => {
      // Act - Tạo todo với JWT token hợp lệ
      // Gửi HTTP POST request đến endpoint /todos
      const response = await request(app.getHttpServer())
        .post('/todos')
        .set('Authorization', 'Bearer valid-token') // Set JWT token trong header
        .send({
          title: 'Test Todo',
          description: 'Test Description',
          isDone: false,
        })
        .expect(201); // Mong đợi status code 201 (Created)

      // Assert - Kiểm tra todo được tạo thành công
      // Verify response body có đầy đủ các field cần thiết
      expect(response.body).toHaveProperty('id', mockTodo.id);
      expect(response.body).toHaveProperty('title', mockTodo.title);
      expect(response.body).toHaveProperty('description', mockTodo.description);
      expect(response.body).toHaveProperty('isDone', mockTodo.isDone);
      expect(response.body).toHaveProperty('ownerId', mockTodo.ownerId);
    });

    it('should fail when creating todo without JWT token', async () => {
      // Act & Assert - Tạo todo mà không có JWT token
      // Test case này kiểm tra authentication guard
      await request(app.getHttpServer())
        .post('/todos')
        .send({
          title: 'Test Todo',
          description: 'Test Description',
        })
        .expect(403); // Forbidden - Guard từ chối vì không có token
    });

    it('should fail when creating todo with invalid data', async () => {
      // Act & Assert - Tạo todo với dữ liệu không hợp lệ
      // Test case này kiểm tra validation pipe
      await request(app.getHttpServer())
        .post('/todos')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: '', // Title rỗng - vi phạm @IsNotEmpty()
          description: 'Test',
        })
        .expect(400); // Bad Request - validation pipe từ chối
    });
  });

  describe('GET /todos - Get All Todos with Pagination', () => {
    // Setup trước mỗi test case
    beforeEach(() => {
      // Mock service method để trả về danh sách todos với pagination metadata
      jest.spyOn(todosService, 'findAllTodos').mockResolvedValue({
        todos: mockTodos, // Danh sách todos
        pagination: {
          page: 1, // Trang hiện tại
          limit: 10, // Số item trên mỗi trang
          total: 3, // Tổng số todos
          totalPages: 1, // Tổng số trang
          hasNextPage: false, // Có trang tiếp theo không
          hasPrevPage: false, // Có trang trước không
        },
        filters: {
          isDone: undefined, // Filter theo trạng thái
          search: undefined, // Filter theo từ khóa tìm kiếm
          dateFrom: undefined, // Filter theo ngày từ
          dateTo: undefined, // Filter theo ngày đến
          sortBy: 'createdAt', // Sắp xếp theo field
          sortOrder: 'desc', // Thứ tự sắp xếp
        },
      });
    });

    it('should get todos with pagination for regular user', async () => {
      // Act - Lấy todos với pagination (không có query params, sử dụng defaults)
      // Gửi HTTP GET request đến endpoint /todos
      const response = await request(app.getHttpServer())
        .get('/todos')
        .set('Authorization', 'Bearer valid-token')
        .expect(200); // Mong đợi status code 200 (OK)

      // Assert - Kiểm tra response structure
      // Verify response có đúng format với todos và pagination metadata
      expect(response.body).toHaveProperty('todos'); // Có field todos
      expect(response.body).toHaveProperty('pagination'); // Có field pagination
      expect(response.body.pagination).toHaveProperty('page', 1); // Trang 1
      expect(response.body.pagination).toHaveProperty('limit', 10); // 10 items/trang
      expect(response.body.pagination).toHaveProperty('total', 3); // Tổng 3 todos
      expect(response.body.pagination).toHaveProperty('totalPages', 1); // 1 trang
      expect(response.body.pagination).toHaveProperty('hasNextPage', false); // Không có trang tiếp
      expect(response.body.pagination).toHaveProperty('hasPrevPage', false); // Không có trang trước

      // Kiểm tra todos được trả về
      expect(Array.isArray(response.body.todos)).toBe(true); // Là array
      expect(response.body.todos).toHaveLength(3); // Có 3 todos
    });

    it('should filter todos by isDone status', async () => {
      // Act - Lọc todos theo trạng thái hoàn thành
      // Test case này kiểm tra filtering functionality
      const response = await request(app.getHttpServer())
        .get('/todos')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Assert - Kiểm tra service được gọi với user và query object
      // Verify service method được gọi với đúng parameters
      expect(todosService.findAllTodos).toHaveBeenCalledWith(
        mockUser, // User object
        expect.any(Object), // Query object (đơn giản hóa assertion)
      );
    });

    it('should search todos by title or description', async () => {
      // Act - Tìm kiếm todos theo từ khóa
      // Test case này kiểm tra search functionality
      const response = await request(app.getHttpServer())
        .get('/todos')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Assert - Kiểm tra service được gọi với user và query object
      // Verify service method được gọi với đúng parameters
      expect(todosService.findAllTodos).toHaveBeenCalledWith(
        mockUser, // User object
        expect.any(Object), // Query object (đơn giản hóa assertion)
      );
    });
  });

  describe('GET /todos/:id - Get Single Todo', () => {
    // Setup trước mỗi test case
    beforeEach(() => {
      // Mock service method để trả về todo theo ID
      jest.spyOn(todosService, 'findOneTodo').mockResolvedValue(mockTodo);
    });

    it('should get todo by ID when user is owner', async () => {
      // Act - Lấy todo mà user là chủ sở hữu
      // Test case này kiểm tra authorization (user chỉ có thể xem todo của mình)
      const response = await request(app.getHttpServer())
        .get('/todos/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200); // Mong đợi status code 200 (OK)

      // Assert - Kiểm tra todo được trả về đúng
      // Verify response có đầy đủ thông tin todo
      expect(response.body).toHaveProperty('id', mockTodo.id);
      expect(response.body).toHaveProperty('title', mockTodo.title);
      expect(response.body).toHaveProperty('ownerId', mockTodo.ownerId);
    });

    it('should fail when todo does not exist', async () => {
      // Arrange - Mock service throw NotFoundException
      // Test case này kiểm tra error handling khi todo không tồn tại
      const { NotFoundException } = require('@nestjs/common');
      jest
        .spyOn(todosService, 'findOneTodo')
        .mockRejectedValue(new NotFoundException('Todo not found'));

      // Act & Assert - Lấy todo không tồn tại
      // Gửi request với ID không tồn tại
      await request(app.getHttpServer())
        .get('/todos/99999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404); // Not Found - Mong đợi status code 404
    });
  });

  describe('PATCH /todos/:id - Update Todo', () => {
    // Tạo todo đã được cập nhật để test
    const updatedTodo = {
      ...mockTodo,
      title: 'Updated Todo Title',
      isDone: true,
    };

    // Setup trước mỗi test case
    beforeEach(() => {
      // Mock service method để trả về todo đã được cập nhật
      jest.spyOn(todosService, 'updateTodo').mockResolvedValue(updatedTodo);
    });

    it('should update todo successfully when user is owner', async () => {
      // Act - Cập nhật todo
      // Test case này kiểm tra update functionality và authorization
      const updateData = {
        title: 'Updated Todo Title',
        isDone: true,
      };

      // Gửi HTTP PATCH request để cập nhật todo
      const response = await request(app.getHttpServer())
        .patch('/todos/1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200); // Mong đợi status code 200 (OK)

      // Assert - Kiểm tra todo được cập nhật
      // Verify các field được cập nhật đúng
      expect(response.body).toHaveProperty('title', updateData.title);
      expect(response.body).toHaveProperty('isDone', updateData.isDone);
      expect(response.body).toHaveProperty('description', mockTodo.description); // Giữ nguyên (không update)
    });

    it('should fail when todo does not exist', async () => {
      // Arrange - Mock service throw NotFoundException
      // Test case này kiểm tra error handling khi update todo không tồn tại
      const { NotFoundException } = require('@nestjs/common');
      jest
        .spyOn(todosService, 'updateTodo')
        .mockRejectedValue(new NotFoundException('Todo not found'));

      // Act & Assert - Cập nhật todo không tồn tại
      // Gửi request update với ID không tồn tại
      await request(app.getHttpServer())
        .patch('/todos/99999')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Update Non-existent Todo' })
        .expect(404); // Not Found - Mong đợi status code 404
    });
  });

  describe('DELETE /todos/:id - Delete Todo', () => {
    // Setup trước mỗi test case
    beforeEach(() => {
      // Mock service method để trả về kết quả xóa thành công
      jest
        .spyOn(todosService, 'removeTodo')
        .mockResolvedValue({ deleted: true });
    });

    it('should delete todo successfully when user is owner', async () => {
      // Act - Xóa todo
      // Test case này kiểm tra delete functionality và authorization
      const response = await request(app.getHttpServer())
        .delete('/todos/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200); // Mong đợi status code 200 (OK)

      // Assert - Kiểm tra xóa thành công
      // Verify response có field deleted = true
      expect(response.body).toHaveProperty('deleted', true);
    });

    it('should fail when todo does not exist', async () => {
      // Arrange - Mock service throw NotFoundException
      // Test case này kiểm tra error handling khi xóa todo không tồn tại
      const { NotFoundException } = require('@nestjs/common');
      jest
        .spyOn(todosService, 'removeTodo')
        .mockRejectedValue(new NotFoundException('Todo not found'));

      // Act & Assert - Xóa todo không tồn tại
      // Gửi request delete với ID không tồn tại
      await request(app.getHttpServer())
        .delete('/todos/99999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404); // Not Found - Mong đợi status code 404
    });
  });

  // ===== TEST AUTHENTICATION & AUTHORIZATION (Test xác thực và phân quyền) =====
  describe('JWT Authentication & Authorization', () => {
    it('should reject requests without JWT token', async () => {
      // Act & Assert - Tất cả requests không có JWT đều bị từ chối
      // Test case này kiểm tra JWT authentication guard
      await request(app.getHttpServer()).get('/todos').expect(403); // Forbidden - Guard từ chối vì không có token

      await request(app.getHttpServer())
        .post('/todos')
        .send({ title: 'Test Todo' })
        .expect(403); // Forbidden - Guard từ chối vì không có token
    });

    it('should reject requests with invalid JWT token', async () => {
      // Act & Assert - Requests với JWT không hợp lệ
      // Test case này kiểm tra JWT validation
      await request(app.getHttpServer())
        .get('/todos')
        .set('Authorization', 'Bearer invalid-token') // Token không hợp lệ
        .expect(403); // Forbidden - Guard từ chối vì token không hợp lệ
    });

    it('should allow admin to access any todo', async () => {
      // Arrange - Mock service cho admin
      // Test case này kiểm tra admin authorization (admin có thể truy cập tất cả)
      jest.spyOn(todosService, 'findAllTodos').mockResolvedValue({
        todos: mockTodos,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        filters: {
          isDone: undefined,
          search: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });

      // Act - Admin truy cập todos
      // Gửi request với admin token
      const response = await request(app.getHttpServer())
        .get('/todos')
        .set('Authorization', 'Bearer admin-token') // Admin token
        .expect(200); // Mong đợi status code 200 (OK)

      // Assert - Admin có thể truy cập
      // Verify admin có thể xem tất cả todos
      expect(response.body).toHaveProperty('todos');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  // ===== TEST ERROR HANDLING & VALIDATION (Test xử lý lỗi và validation) =====
  describe('Error Handling & Validation', () => {
    it('should handle invalid pagination parameters', async () => {
      // Act & Assert - Pagination parameters không hợp lệ
      // Test case này kiểm tra validation pipe với query parameters
      // Validation pipe sẽ reject page=0 và limit=-1 (vi phạm @Min(1))
      await request(app.getHttpServer())
        .get('/todos?page=0&limit=-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(400); // Bad Request due to validation
    });

    it('should handle malformed request body', async () => {
      // Act & Assert - Request body không đúng format
      // Test case này kiểm tra JSON parsing error
      await request(app.getHttpServer())
        .post('/todos')
        .set('Authorization', 'Bearer valid-token')
        .send('invalid json') // JSON không hợp lệ
        .set('Content-Type', 'application/json')
        .expect(400); // Bad Request - JSON parsing error
    });

    it('should validate required fields', async () => {
      // Act & Assert - Thiếu field bắt buộc
      // Test case này kiểm tra DTO validation (thiếu required field)
      await request(app.getHttpServer())
        .post('/todos')
        .set('Authorization', 'Bearer valid-token')
        .send({
          description: 'Missing title', // Thiếu field 'title' (required)
        })
        .expect(400); // Bad Request - validation error (vi phạm @IsNotEmpty())
    });
  });
});
