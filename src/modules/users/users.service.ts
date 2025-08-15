import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { Repository } from 'typeorm';
import { CreateUsersDto } from '@/modules/users/dto/create-users.dto';
import * as bcrypt from 'bcryptjs'; // Thư viện để mã hóa mật khẩu
import { UpdateRoleDto } from '@/modules/users/dto/update-role.dto';
import { ADMIN_ROLE } from '@/common/constants/roles.constant';

/**
 * UserService - Service xử lý business logic cho user
 *
 * Service này chứa các phương thức để:
 * - Tạo user mới với mật khẩu đã mã hóa
 * - Tìm user theo username, email, hoặc ID
 * - Quản lý tương tác với database
 * - Cập nhật role của user với validation
 * - Cache management để tăng performance
 */
@Injectable()
export class UserService {
  // Logger để ghi log các hoạt động của service
  private readonly logger = new Logger(UserService.name);

  // Cache để lưu trữ user data tạm thời, tăng performance
  private readonly cache = new Map<number, UsersEntity>();

  constructor(
    // Inject repository để tương tác với bảng users trong database
    // Repository pattern của TypeORM
    @InjectRepository(UsersEntity)
    private usersRepository: Repository<UsersEntity>,
  ) {}

  /**
   * Tạo user mới với mật khẩu đã được mã hóa
   *
   * Quy trình:
   * 1. Kiểm tra username đã tồn tại chưa
   * 2. Mã hóa mật khẩu với bcrypt
   * 3. Tạo và lưu user vào database
   * 4. Trả về user (không có password) để bảo mật
   *
   * @param createUserDto - Dữ liệu user từ client (username, email, password)
   * @returns Promise<Omit<UsersEntity, 'password'>> - User đã được tạo (không có password)
   *
   * @example
   * const newUser = await userService.createUser({
   *   username: "john_doe",
   *   email: "john@example.com",
   *   password: "password123"
   * });
   */
  async createUser(
    createUserDto: CreateUsersDto,
  ): Promise<Omit<UsersEntity, 'password'>> {
    try {
      this.logger.debug(`Creating new user: ${createUserDto.username}`);

      // Destructure dữ liệu từ DTO
      const { username, email, password } = createUserDto;

      // Kiểm tra username đã tồn tại chưa
      const existingUser = await this.findByUsername(username);
      if (existingUser) {
        this.logger.warn(`Username already exists: ${username}`);
        throw new ConflictException('Username already exists');
      }

      // Mã hóa mật khẩu với salt rounds = 10 (độ mạnh mã hóa)
      // bcrypt.hash() sẽ tạo ra hash an toàn với salt ngẫu nhiên
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo entity mới với mật khẩu đã mã hóa
      const user = this.usersRepository.create({
        username,
        email,
        password: hashedPassword,
      });

      // Lưu user vào database
      const savedUser = await this.usersRepository.save(user);

      // Loại bỏ password khỏi response để bảo mật
      // Destructuring để tách password ra khỏi object
      const { password: _, ...userWithoutPassword } = savedUser;

      this.logger.log(`User created successfully: ${username}`);
      return userWithoutPassword;
    } catch (error) {
      // Re-throw ConflictException nếu đã có (username đã tồn tại)
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      // Xử lý lỗi database
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Tìm user theo username (bao gồm password) - chỉ dùng cho xác thực
   *
   * Lưu ý: Method này trả về cả password để so sánh khi login
   * Không nên sử dụng cho các trường hợp khác
   *
   * @param username - Tên đăng nhập cần tìm
   * @returns Promise<UsersEntity | null> - User nếu tìm thấy (bao gồm password), null nếu không
   *
   * @example
   * const user = await userService.findByUsername("john_doe");
   * if (user) {
   *   // Có thể truy cập user.password để so sánh
   * }
   */
  async findByUsername(username: string): Promise<UsersEntity | null> {
    try {
      // Tìm user trong database theo username (bao gồm password)
      const user = await this.usersRepository.findOne({ where: { username } });
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to find user by username: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to find user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Tìm user theo email (bao gồm password) - chỉ dùng cho xác thực
   *
   * Tương tự findByUsername, method này cũng trả về password
   * Chỉ sử dụng cho authentication purposes
   *
   * @param email - Email cần tìm
   * @returns Promise<UsersEntity | null> - User nếu tìm thấy (bao gồm password), null nếu không
   *
   * @example
   * const user = await userService.findByEmail("john@example.com");
   * if (user) {
   *   // Có thể truy cập user.password để so sánh
   * }
   */
  async findByEmail(email: string): Promise<UsersEntity | null> {
    try {
      // Tìm user trong database theo email (bao gồm password)
      const user = await this.usersRepository.findOne({ where: { email } });
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to find user by email: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to find user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Tìm user theo username hoặc email (bao gồm password) - chỉ dùng cho xác thực
   *
   * Method này linh hoạt cho phép login bằng username hoặc email
   * Sử dụng OR condition trong database query
   *
   * @param usernameOrEmail - Username hoặc email cần tìm
   * @returns Promise<UsersEntity | null> - User nếu tìm thấy (bao gồm password), null nếu không
   *
   * @example
   * const user = await userService.findByUsernameOrEmail("john_doe");
   * const user2 = await userService.findByUsernameOrEmail("john@example.com");
   */
  async findByUsernameOrEmail(
    usernameOrEmail: string,
  ): Promise<UsersEntity | null> {
    try {
      // Tìm user trong database theo username hoặc email (bao gồm password)
      // Sử dụng array conditions để tạo OR query
      const user = await this.usersRepository.findOne({
        where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      });
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to find user by username or email: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to find user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy tất cả users từ database (sắp xếp theo thời gian tạo mới nhất)
   *
   * Method này trả về tất cả users, thường chỉ dùng cho admin
   * Sắp xếp theo createdAt DESC để user mới nhất hiển thị đầu tiên
   *
   * @returns Promise<UsersEntity[]> - Danh sách tất cả users
   */
  async findAll(): Promise<UsersEntity[]> {
    try {
      // Tìm tất cả users và sắp xếp theo createdAt giảm dần (mới nhất trước)
      const users = await this.usersRepository.find({
        order: { createdAt: 'DESC' },
      });
      this.logger.debug(`Retrieved ${users.length} users`);
      return users;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve users: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Tìm user theo ID với caching
   *
   * Method này sử dụng cache để tăng performance:
   * 1. Kiểm tra cache trước
   * 2. Nếu không có trong cache, query database
   * 3. Lưu kết quả vào cache để lần sau sử dụng
   *
   * @param id - ID của user cần tìm
   * @returns Promise<UsersEntity> - User nếu tìm thấy
   * @throws NotFoundException - Nếu không tìm thấy user
   */
  async findById(id: number): Promise<UsersEntity> {
    try {
      // Kiểm tra cache trước - nếu có thì trả về ngay
      if (this.cache.has(id)) {
        this.logger.debug(`User ${id} found in cache`);
        return this.cache.get(id)!;
      }

      // Tìm user theo ID từ database
      const user = await this.usersRepository.findOne({ where: { id } });

      // Nếu không tìm thấy user thì throw NotFoundException
      if (!user) {
        this.logger.warn(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      // Lưu vào cache để tăng performance cho lần truy cập sau
      this.cache.set(id, user);
      this.logger.debug(`User ${id} cached`);

      return user;
    } catch (error) {
      // Re-throw NotFoundException nếu đã có
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to find user by ID: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to find user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cập nhật role của user
   *
   * Method này có validation business logic:
   * 1. Kiểm tra user có tồn tại không
   * 2. Kiểm tra không được downgrade admin cuối cùng
   * 3. Cập nhật role và cache
   *
   * @param id - ID của user cần cập nhật role
   * @param dto - DTO chứa role mới (UpdateRoleDto)
   * @returns Promise<UsersEntity> - User đã được cập nhật role
   *
   * @example
   * const updatedUser = await userService.updateRole(123, { role: 'admin' });
   */
  async updateRole(id: number, dto: UpdateRoleDto): Promise<UsersEntity> {
    try {
      this.logger.debug(`Updating role for user ${id} to ${dto.role}`);

      // Tìm user theo ID (sẽ throw NotFoundException nếu không tìm thấy)
      const user = await this.findById(id);

      // Kiểm tra xem có đang downgrade admin cuối cùng không
      // Business rule: Không được để hệ thống không có admin nào
      if (user.role === ADMIN_ROLE && dto.role !== ADMIN_ROLE) {
        const adminCount = await this.usersRepository.count({
          where: { role: ADMIN_ROLE },
        });
        if (adminCount <= 1) {
          this.logger.warn(`Cannot downgrade last admin user: ${id}`);
          throw new ConflictException('Cannot downgrade the last admin user');
        }
      }

      // Cập nhật role mới
      user.role = dto.role;

      // Lưu thay đổi vào database và trả về user đã cập nhật
      const updatedUser = await this.usersRepository.save(user);

      // Cập nhật cache với thông tin mới
      this.cache.set(id, updatedUser);

      this.logger.log(`Role updated successfully for user ${id}: ${dto.role}`);
      return updatedUser;
    } catch (error) {
      // Re-throw specific exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update role: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to update user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Xóa user khỏi cache
   *
   * Method này dùng để invalidate cache khi user data thay đổi
   * Đảm bảo cache luôn có data mới nhất
   *
   * @param id - ID của user cần xóa khỏi cache
   */
  clearCache(id: number): void {
    this.cache.delete(id);
    this.logger.debug(`User ${id} removed from cache`);
  }

  /**
   * Xóa toàn bộ cache
   *
   * Method này dùng để clear cache khi cần thiết
   * Ví dụ: khi có thay đổi lớn trong hệ thống
   */
  clearAllCache(): void {
    this.cache.clear();
    this.logger.debug('All user cache cleared');
  }
}
