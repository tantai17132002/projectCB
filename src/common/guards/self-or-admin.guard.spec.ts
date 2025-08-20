import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SelfOrAdminGuard } from '@/common/guards/self-or-admin.guard';
import { ADMIN_ROLE, USER_ROLE } from '@/common/constants/roles.constant';
import { JwtUser } from '@/common/types/jwt-user.type';

/**
 * Unit Tests cho SelfOrAdminGuard
 *
 * Đây là loại test đơn vị (Unit Test) để kiểm tra:
 * - Logic authorization "self-or-admin" (tự mình hoặc admin)
 * - KHÔNG chạm database thật (sử dụng mock ExecutionContext)
 * - Mock tất cả dependencies (ExecutionContext, Request)
 * - Test từng scenario riêng lẻ với các user/admin khác nhau
 * - Kiểm tra error handling và exception throwing
 *
 * Mục tiêu:
 * - user truy cập resource của người khác → throw ForbiddenException (403)
 * - user truy cập resource của chính mình → return true (pass)
 * - admin truy cập bất kỳ resource nào → return true (pass)
 * - ID không hợp lệ → throw BadRequestException (400)
 */
describe('SelfOrAdminGuard', () => {
  let guard: SelfOrAdminGuard; // Guard cần test

  // ===== MOCK DATA (Dữ liệu giả lập) =====
  // Tạo mock users với các roles và IDs khác nhau
  const mockAdminUser: JwtUser = {
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    role: ADMIN_ROLE, // Admin user
  };

  const mockRegularUser: JwtUser = {
    id: 2,
    username: 'user',
    email: 'user@test.com',
    role: USER_ROLE, // Regular user với ID = 2
  };

  const mockAnotherUser: JwtUser = {
    id: 3,
    username: 'anotheruser',
    email: 'another@test.com',
    role: USER_ROLE, // User khác với ID = 3
  };

  // ===== SETUP TEST MODULE (Thiết lập module test) =====
  beforeEach(async () => {
    // Tạo test module (guard không có dependencies ngoài)
    const module: TestingModule = await Test.createTestingModule({
      providers: [SelfOrAdminGuard], // Guard thật (không mock) để test logic
    }).compile();

    // Lấy instance để test
    guard = module.get<SelfOrAdminGuard>(SelfOrAdminGuard);
  });

  // ===== HELPER FUNCTION (Hàm hỗ trợ) =====
  /**
   * Tạo mock ExecutionContext với user và param ID
   * ExecutionContext chứa thông tin về request hiện tại
   */
  const createMockExecutionContext = (
    user: JwtUser | null = null,
    paramId: string = '1',
  ): jest.Mocked<ExecutionContext> => {
    const mockRequest = {
      user, // Mock user trong request (từ JWT)
      params: { id: paramId }, // Mock URL parameters (ví dụ: /users/:id)
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest), // Mock request object
      }),
    } as any;
  };

  // ===== TEST CASES =====

  describe('canActivate', () => {
    // ===== TEST: User authentication =====
    it('should throw ForbiddenException when user is not authenticated', () => {
      // Arrange - Chuẩn bị scenario: user không được xác thực
      const mockContext = createMockExecutionContext(null, '1'); // Không có user

      // Act & Assert - Verify ném ForbiddenException
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('User not authenticated');
    });

    // ===== TEST: ID parameter validation =====
    it('should throw BadRequestException for invalid ID (NaN)', () => {
      // Arrange - Chuẩn bị scenario: ID không phải số
      const mockContext = createMockExecutionContext(mockRegularUser, 'invalid');

      // Act & Assert - Verify ném BadRequestException
      expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Invalid user ID. Must be a positive integer.',
      );
    });

    it('should throw BadRequestException for negative ID', () => {
      // Arrange - Chuẩn bị scenario: ID âm
      const mockContext = createMockExecutionContext(mockRegularUser, '-1');

      // Act & Assert - Verify ném BadRequestException
      expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Invalid user ID. Must be a positive integer.',
      );
    });

    it('should throw BadRequestException for zero ID', () => {
      // Arrange - Chuẩn bị scenario: ID = 0
      const mockContext = createMockExecutionContext(mockRegularUser, '0');

      // Act & Assert - Verify ném BadRequestException
      expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Invalid user ID. Must be a positive integer.',
      );
    });

    it('should throw BadRequestException for decimal ID', () => {
      // Arrange - Chuẩn bị scenario: ID là số thập phân
      const mockContext = createMockExecutionContext(mockRegularUser, '1.5');

      // Act & Assert - Verify ném BadRequestException
      expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Invalid user ID. Must be a positive integer.',
      );
    });

    // ===== TEST: Admin access (unlimited) =====
    it('should allow admin access to any resource', () => {
      // Arrange - Chuẩn bị scenario: admin truy cập resource bất kỳ
      const mockContext = createMockExecutionContext(mockAdminUser, '999'); // ID bất kỳ

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify admin có thể truy cập bất kỳ resource nào
      expect(result).toBe(true); // Pass vì admin có quyền unlimited
    });

    it('should allow admin access to different user resource', () => {
      // Arrange - Chuẩn bị scenario: admin (ID=1) truy cập resource của user khác (ID=2)
      const mockContext = createMockExecutionContext(mockAdminUser, '2');

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify admin có thể truy cập resource của user khác
      expect(result).toBe(true); // Pass vì admin
    });

    // ===== TEST: Self access (own resources) =====
    it('should allow user access to their own resource', () => {
      // Arrange - Chuẩn bị scenario: user (ID=2) truy cập resource của chính mình (ID=2)
      const mockContext = createMockExecutionContext(mockRegularUser, '2');

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify user có thể truy cập resource của chính mình
      expect(result).toBe(true); // Pass vì self-access
    });

    it('should allow user access to their own resource with different ID format', () => {
      // Arrange - Chuẩn bị scenario: test với format ID khác (string to number conversion)
      const userWithId10: JwtUser = { ...mockRegularUser, id: 10 };
      const mockContext = createMockExecutionContext(userWithId10, '10');

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify string "10" được convert thành number 10 và match
      expect(result).toBe(true); // Pass vì self-access
    });

    // ===== TEST: Access denial (other users' resources) =====
    it('should deny user access to other user resource', () => {
      // Arrange - Chuẩn bị scenario: user (ID=2) truy cập resource của user khác (ID=3)
      const mockContext = createMockExecutionContext(mockRegularUser, '3');

      // Act & Assert - Verify ném ForbiddenException
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Access denied. You can only access your own resources.',
      );
    });

    it('should deny user access to admin resource', () => {
      // Arrange - Chuẩn bị scenario: user thường (ID=2) truy cập resource của admin (ID=1)
      const mockContext = createMockExecutionContext(mockRegularUser, '1');

      // Act & Assert - Verify ném ForbiddenException
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Access denied. You can only access your own resources.',
      );
    });

    it('should deny when user tries to access much higher ID', () => {
      // Arrange - Chuẩn bị scenario: user (ID=2) truy cập resource với ID rất cao
      const mockContext = createMockExecutionContext(mockRegularUser, '99999');

      // Act & Assert - Verify ném ForbiddenException
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Access denied. You can only access your own resources.',
      );
    });

    // ===== TEST: Edge cases =====
    it('should handle valid large ID numbers', () => {
      // Arrange - Chuẩn bị scenario: test với ID số lớn hợp lệ
      const userWithLargeId: JwtUser = { ...mockRegularUser, id: 1000000 };
      const mockContext = createMockExecutionContext(userWithLargeId, '1000000');

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify xử lý được ID số lớn
      expect(result).toBe(true); // Pass vì self-access với large ID
    });

    it('should handle ID with leading zeros', () => {
      // Arrange - Chuẩn bị scenario: ID có số 0 đầu (string "002" -> number 2)
      const mockContext = createMockExecutionContext(mockRegularUser, '002');

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify "002" được convert thành 2 và match với user.id = 2
      expect(result).toBe(true); // Pass vì "002" -> 2 = user.id
    });

    // ===== TEST: Type conversion edge cases =====
    it('should handle string ID that converts to valid number', () => {
      // Arrange - Chuẩn bị scenario: string ID hợp lệ
      const mockContext = createMockExecutionContext(mockRegularUser, '2');

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify string "2" được convert thành number 2
      expect(result).toBe(true); // Pass vì self-access
    });

    it('should properly convert and compare IDs', () => {
      // Arrange - Chuẩn bị để verify quá trình conversion
      const mockContext = createMockExecutionContext(mockAnotherUser, '3'); // user.id=3, param="3"

      // Act - Kiểm tra quyền truy cập
      const result = guard.canActivate(mockContext);

      // Assert - Verify Number("3") === 3 (user.id)
      expect(result).toBe(true); // Pass vì conversion và comparison đúng
    });
  });
});
