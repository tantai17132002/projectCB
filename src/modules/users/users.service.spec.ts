import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserService } from '@/modules/users/users.service';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { CreateUsersDto } from '@/modules/users/dto/create-users.dto';
import { UpdateRoleDto } from '@/modules/users/dto/update-role.dto';
import { QueryUserDto } from '@/modules/users/dto/query-user.dto';
import { ADMIN_ROLE } from '@/common/constants/roles.constant';

// Mock bcryptjs để kiểm soát kết quả hash password trong test
jest.mock('bcryptjs');

/**
 * Unit Tests cho UserService
 *
 * Đây là loại test đơn vị (Unit Test) để kiểm tra:
 * - Logic riêng trong UserService (business logic)
 * - KHÔNG chạm database thật (sử dụng mock repository)
 * - Mock tất cả dependencies (Repository, DataSource, bcrypt)
 * - Test từng method riêng lẻ với các scenarios khác nhau
 * - Kiểm tra error handling, validation, caching logic
 *
 * Khác với Integration Test, Unit Test tập trung vào test
 * từng function/method riêng biệt mà không test toàn bộ flow
 */
describe('UserService', () => {
  let service: UserService; // Service cần test
  let usersRepository: jest.Mocked<Repository<UsersEntity>>; // Mock repository
  let dataSource: jest.Mocked<DataSource>; // Mock DataSource cho transactions

  // ===== MOCK DATA (Dữ liệu giả lập) =====
  // Tạo user giả để test các scenarios
  const mockUser: UsersEntity = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword123', // Password đã được hash
    role: 'user', // Role thường
    createdAt: new Date(),
    updatedAt: new Date(),
    todos: Promise.resolve([]), // Relationship với todos (Promise vì lazy loading)
  } as UsersEntity;

  // DTO để test tạo user mới
  const mockCreateUserDto: CreateUsersDto = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'password123', // Password chưa hash (raw)
  };

  // DTO để test cập nhật role
  const mockUpdateRoleDto: UpdateRoleDto = {
    role: 'admin',
  };

  // DTO để test query với pagination
  const mockQueryUserDto: QueryUserDto = {
    page: 1,
    limit: 10,
  };

  // ===== SETUP TEST MODULE (Thiết lập module test) =====
  beforeEach(async () => {
    // Mock QueryRunner cho transactions (database operations với rollback)
    const mockQueryRunner = {
      connect: jest.fn(), // Kết nối database
      startTransaction: jest.fn(), // Bắt đầu transaction
      commitTransaction: jest.fn(), // Commit thành công
      rollbackTransaction: jest.fn(), // Rollback khi có lỗi
      release: jest.fn(), // Giải phóng connection
      manager: {
        count: jest.fn(), // Đếm số lượng records
        save: jest.fn(), // Lưu entity
      },
    };

    // Tạo test module với mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService, // Service thật (không mock) để test logic
        {
          // Mock UsersEntity Repository (giả lập database operations)
          provide: getRepositoryToken(UsersEntity),
          useValue: {
            create: jest.fn(), // Tạo entity mới
            save: jest.fn(), // Lưu entity vào DB
            findOne: jest.fn(), // Tìm 1 user theo điều kiện
            findAndCount: jest.fn(), // Tìm nhiều user với count (pagination)
            count: jest.fn(), // Đếm số lượng user
          },
        },
        {
          // Mock DataSource cho transactions
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    // Lấy instances để test
    service = module.get<UserService>(UserService);
    usersRepository = module.get(getRepositoryToken(UsersEntity));
    dataSource = module.get(DataSource);
  });

  // Dọn dẹp mocks sau mỗi test để tránh ảnh hưởng lẫn nhau
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===== TEST createUser METHOD =====
  describe('createUser', () => {
    it('should create user successfully', async () => {
      // Arrange - Chuẩn bị dữ liệu và mock behaviors
      const hashedPassword = 'hashedPassword123'; // Password đã hash giả lập
      const createdUser = {
        ...mockUser,
        ...mockCreateUserDto,
        password: hashedPassword,
      };
      const userWithoutPassword = { ...createdUser };
      delete (userWithoutPassword as any).password; // Xóa password để return về client

      // Mock các dependencies
      usersRepository.findOne.mockResolvedValue(null); // Username chưa tồn tại
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword); // Mock hash password
      usersRepository.create.mockReturnValue(createdUser); // Mock tạo entity
      usersRepository.save.mockResolvedValue(createdUser); // Mock lưu vào DB

      // Act - Thực hiện action cần test
      const result = await service.createUser(mockCreateUserDto);

      // Assert - Kiểm tra kết quả và các calls
      // Verify kiểm tra username đã tồn tại chưa
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { username: mockCreateUserDto.username },
      });
      // Verify password được hash với salt rounds = 10
      expect(bcrypt.hash).toHaveBeenCalledWith(mockCreateUserDto.password, 10);
      // Verify entity được tạo với password đã hash
      expect(usersRepository.create).toHaveBeenCalledWith({
        ...mockCreateUserDto,
        password: hashedPassword,
      });
      // Verify entity được save vào database
      expect(usersRepository.save).toHaveBeenCalledWith(createdUser);
      // Verify result không chứa password (bảo mật)
      expect(result).toEqual(userWithoutPassword);
    });

    it('should throw ConflictException when username already exists', async () => {
      // Arrange - Chuẩn bị scenario: username đã tồn tại
      usersRepository.findOne.mockResolvedValue(mockUser); // Username đã tồn tại

      // Act & Assert - Test error handling
      // Verify ném ConflictException
      await expect(service.createUser(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      // Verify message error chính xác
      await expect(service.createUser(mockCreateUserDto)).rejects.toThrow(
        'Username already exists',
      );

      // Verify chỉ check username, không thực hiện các bước khác
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { username: mockCreateUserDto.username },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled(); // Không hash password
      expect(usersRepository.create).not.toHaveBeenCalled(); // Không tạo user
    });

    it('should handle bcrypt hash errors', async () => {
      // Arrange - Chuẩn bị scenario: bcrypt hash bị lỗi
      const hashError = new Error('Hash error');
      usersRepository.findOne.mockResolvedValue(null); // Username chưa tồn tại
      (bcrypt.hash as jest.Mock).mockRejectedValue(hashError); // Mock hash error

      // Act & Assert - Test error propagation
      // Verify service propagate bcrypt error
      await expect(service.createUser(mockCreateUserDto)).rejects.toThrow(
        'Hash error',
      );
    });
  });

  // ===== TEST findByUsername METHOD =====
  describe('findByUsername', () => {
    it('should return user when found', async () => {
      // Arrange - Mock repository trả về user
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act - Tìm user theo username
      const result = await service.findByUsername('testuser');

      // Assert - Verify query đúng và kết quả đúng
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange - Mock repository trả về null (không tìm thấy user)
      usersRepository.findOne.mockResolvedValue(null);

      // Act - Tìm user không tồn tại
      const result = await service.findByUsername('nonexistent');

      // Assert - Verify query đúng và kết quả null
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
      expect(result).toBeNull(); // Trả về null khi không tìm thấy
    });
  });

  // ===== TEST findByEmail METHOD =====
  describe('findByEmail', () => {
    it('should return user when found', async () => {
      // Arrange - Mock repository trả về user
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act - Tìm user theo email
      const result = await service.findByEmail('test@example.com');

      // Assert - Verify query đúng và kết quả đúng
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange - Mock repository trả về null (không tìm thấy user)
      usersRepository.findOne.mockResolvedValue(null);

      // Act - Tìm email không tồn tại
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert - Verify query đúng và kết quả null
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull(); // Trả về null khi không tìm thấy
    });
  });

  // ===== TEST findByUsernameOrEmail METHOD (flexible search) =====
  describe('findByUsernameOrEmail', () => {
    it('should return user when found by username', async () => {
      // Arrange - Mock repository trả về user
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act - Tìm user bằng username (có thể là username hoặc email)
      const result = await service.findByUsernameOrEmail('testuser');

      // Assert - Verify query với OR condition (username OR email)
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: 'testuser' }, { email: 'testuser' }], // OR condition
      });
      expect(result).toEqual(mockUser);
    });

    it('should return user when found by email', async () => {
      // Arrange - Mock repository trả về user
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act - Tìm user bằng email (có thể là username hoặc email)
      const result = await service.findByUsernameOrEmail('test@example.com');

      // Assert - Verify query với OR condition (username OR email)
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: [
          { username: 'test@example.com' },
          { email: 'test@example.com' },
        ], // OR condition
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange - Mock repository trả về null (không tìm thấy user)
      usersRepository.findOne.mockResolvedValue(null);

      // Act - Tìm user không tồn tại (cả username và email)
      const result = await service.findByUsernameOrEmail('nonexistent');

      // Assert - Verify query với OR condition và kết quả null
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: 'nonexistent' }, { email: 'nonexistent' }], // OR condition
      });
      expect(result).toBeNull(); // Trả về null khi không tìm thấy
    });
  });

  // ===== TEST findAll METHOD (với pagination logic) =====
  describe('findAll', () => {
    it('should return users with pagination', async () => {
      // Arrange - Mock repository trả về users và total count
      const users = [mockUser];
      const total = 1;
      usersRepository.findAndCount.mockResolvedValue([users, total]); // [data, count]

      // Act - Lấy danh sách users với pagination
      const result = await service.findAll(mockQueryUserDto);

      // Assert - Verify pagination logic và response structure
      // Verify query parameters đúng
      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' }, // Sắp xếp theo thời gian tạo (mới nhất trước)
        skip: 0, // Bỏ qua 0 records (trang đầu)
        take: 10, // Lấy 10 records
      });
      // Verify response structure
      expect(result.users).toEqual(users); // Danh sách users
      expect(result.pagination.total).toBe(total); // Tổng số users
      expect(result.pagination.page).toBe(1); // Trang hiện tại
      expect(result.pagination.limit).toBe(10); // Số records trên mỗi trang
      expect(result.pagination.totalPages).toBe(1); // Tổng số trang
      expect(result.pagination.hasNextPage).toBe(false); // Không có trang tiếp
      expect(result.pagination.hasPrevPage).toBe(false); // Không có trang trước
    });

    it('should handle pagination correctly', async () => {
      // Arrange - Test pagination với page 2, limit 5
      const users = [mockUser];
      const total = 25; // Tổng 25 users
      const queryWithPagination = { page: 2, limit: 5 }; // Trang 2, 5 users/trang
      usersRepository.findAndCount.mockResolvedValue([users, total]);

      // Act - Lấy users với pagination tùy chỉnh
      const result = await service.findAll(queryWithPagination);

      // Assert - Verify pagination calculation logic
      // Verify skip/take calculation: page 2, limit 5 => skip = (2-1)*5 = 5, take = 5
      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 5, // Bỏ qua 5 records đầu (trang 1)
        take: 5, // Lấy 5 records (trang 2)
      });
      // Verify pagination metadata
      expect(result.pagination.page).toBe(2); // Trang hiện tại
      expect(result.pagination.limit).toBe(5); // Số records/trang
      expect(result.pagination.totalPages).toBe(5); // Tổng 5 trang (25/5)
      expect(result.pagination.hasNextPage).toBe(true); // Có trang tiếp (trang 3,4,5)
      expect(result.pagination.hasPrevPage).toBe(true); // Có trang trước (trang 1)
    });

    it('should use default pagination when no query provided', async () => {
      // Arrange - Test default pagination (không có query parameters)
      const users = [mockUser];
      const total = 1;
      usersRepository.findAndCount.mockResolvedValue([users, total]);

      // Act - Lấy users không có pagination parameters
      const result = await service.findAll();

      // Assert - Verify default pagination values được sử dụng
      // Verify default query parameters: page=1, limit=10
      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 0, // Default: page 1 => skip = (1-1)*10 = 0
        take: 10, // Default: limit = 10
      });
      // Verify default pagination metadata
      expect(result.pagination.page).toBe(1); // Default page = 1
      expect(result.pagination.limit).toBe(10); // Default limit = 10
    });
  });

  // ===== TEST findById METHOD (với caching logic) =====
  describe('findById', () => {
    it('should return user from cache when available', async () => {
      // Arrange - Set user vào cache trước
      const userId = 1;
      service['cache'].set(userId, mockUser);

      // Act - Tìm user theo ID
      const result = await service.findById(userId);

      // Assert - Verify không query database, lấy từ cache
      expect(usersRepository.findOne).not.toHaveBeenCalled(); // Không query DB
      expect(result).toEqual(mockUser);
    });

    it('should return user from database and cache it', async () => {
      // Arrange - Cache chưa có user, mock repository trả về user
      const userId = 1;
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act - Tìm user theo ID
      const result = await service.findById(userId);

      // Assert - Verify query database và cache kết quả
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(mockUser);
      expect(service['cache'].has(userId)).toBe(true); // User được cache
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange - Mock repository trả về null (user không tồn tại)
      const userId = 999;
      usersRepository.findOne.mockResolvedValue(null);

      // Act & Assert - Test error handling khi user không tồn tại
      // Verify ném NotFoundException
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
      // Verify message error chính xác
      await expect(service.findById(userId)).rejects.toThrow('User not found');

      // Verify query database với ID đúng
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  // ===== TEST updateRole METHOD (với transaction logic) =====
  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      // Arrange - Chuẩn bị transaction scenario thành công
      const userId = 1;
      const updatedUser = { ...mockUser, role: 'admin' as 'admin' };
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(), // Bắt đầu transaction
        commitTransaction: jest.fn(), // Commit thành công
        rollbackTransaction: jest.fn(), // Không được gọi
        release: jest.fn(), // Giải phóng connection
        manager: {
          count: jest.fn().mockResolvedValue(2), // Có > 1 admin (safe để downgrade)
          save: jest.fn().mockResolvedValue(updatedUser), // Save thành công
        },
      };

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser); // Mock tìm user

      // Act - Cập nhật role của user
      const result = await service.updateRole(userId, mockUpdateRoleDto);

      // Assert - Verify transaction flow và caching
      expect(service.findById).toHaveBeenCalledWith(userId); // Tìm user trước
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled(); // Start transaction
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled(); // Commit thành công
      expect(mockQueryRunner.release).toHaveBeenCalled(); // Giải phóng connection
      expect(result).toEqual(updatedUser); // Return user đã update
      expect(service['cache'].get(userId)).toEqual(updatedUser); // Cache được update
    });

    it('should throw ConflictException when downgrading last admin', async () => {
      // Arrange - Chuẩn bị scenario: downgrade admin cuối cùng (business rule violation)
      const userId = 1;
      const adminUser = { ...mockUser, role: 'admin' as 'admin' }; // User hiện tại là admin
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(), // Sẽ được gọi khi có lỗi
        release: jest.fn(),
        manager: {
          count: jest.fn().mockResolvedValue(1), // Chỉ có 1 admin (user hiện tại)
          save: jest.fn(), // Không được gọi
        },
      };

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);
      jest.spyOn(service, 'findById').mockResolvedValue(adminUser); // Mock tìm user

      // Act & Assert - Test business rule: không cho phép downgrade admin cuối cùng
      // Verify ném ConflictException
      await expect(
        service.updateRole(userId, { role: 'user' }),
      ).rejects.toThrow(ConflictException);
      // Verify message error chính xác
      await expect(
        service.updateRole(userId, { role: 'user' }),
      ).rejects.toThrow('Cannot downgrade the last admin user');

      // Verify transaction được rollback và connection được release
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled(); // Rollback transaction
      expect(mockQueryRunner.release).toHaveBeenCalled(); // Giải phóng connection
    });

    it('should handle transaction errors', async () => {
      // Arrange - Chuẩn bị scenario: database error trong transaction
      const userId = 1;
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(), // Không được gọi (có lỗi)
        rollbackTransaction: jest.fn(), // Sẽ được gọi khi có lỗi
        release: jest.fn(),
        manager: {
          count: jest.fn(),
          save: jest.fn().mockRejectedValue(new Error('Database error')), // Mock database error
        },
      };

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser); // Mock tìm user

      // Act & Assert - Test error handling trong transaction
      // Verify service propagate database error
      await expect(
        service.updateRole(userId, mockUpdateRoleDto),
      ).rejects.toThrow('Database error');

      // Verify transaction được rollback và connection được release
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled(); // Rollback transaction
      expect(mockQueryRunner.release).toHaveBeenCalled(); // Giải phóng connection
    });
  });

  // ===== TEST CACHE MANAGEMENT METHODS =====
  describe('clearCache', () => {
    it('should remove user from cache', () => {
      // Arrange - Set user vào cache trước
      const userId = 1;
      service['cache'].set(userId, mockUser);

      // Act - Xóa user khỏi cache
      service.clearCache(userId);

      // Assert - Verify user đã được xóa khỏi cache
      expect(service['cache'].has(userId)).toBe(false); // Cache không còn user này
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', () => {
      // Arrange - Set nhiều users vào cache
      service['cache'].set(1, mockUser);
      service['cache'].set(2, { ...mockUser, id: 2 });

      // Act - Xóa toàn bộ cache
      service.clearAllCache();

      // Assert - Verify cache đã được clear hoàn toàn
      expect(service['cache'].size).toBe(0); // Cache rỗng
    });
  });
});
