import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { Repository } from 'typeorm';
import { CreateUsersDto } from '@/modules/users/dto/create-users.dto';
import * as bcrypt from 'bcryptjs'; // Thư viện để mã hóa mật khẩu

/**
 * UserService - Service xử lý business logic cho user
 *
 * Service này chứa các phương thức để:
 * - Tạo user mới với mật khẩu đã mã hóa
 * - Tìm user theo username
 * - Quản lý tương tác với database
 */
@Injectable()
export class UserService {
  constructor(
    // Inject repository để tương tác với bảng users trong database
    @InjectRepository(UsersEntity)
    private usersRepository: Repository<UsersEntity>,
  ) {}

  /**
   * Tạo user mới với mật khẩu đã được mã hóa
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
  async createUser(createUserDto: CreateUsersDto): Promise<Omit<UsersEntity, 'password'>> {
    try {
      // Destructure dữ liệu từ DTO
      const { username, email, password } = createUserDto;

      // Kiểm tra username đã tồn tại chưa
      const existingUser = await this.findByUsername(username);
      if (existingUser) {
        throw new HttpException(
          'Username already exists',
          HttpStatus.CONFLICT
        );
      }

      // Mã hóa mật khẩu với salt rounds = 10 (độ mạnh mã hóa)
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
      const { password: _, ...userWithoutPassword } = savedUser;
      return userWithoutPassword;
    } catch (error) {
      // Re-throw HttpException nếu đã có
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Xử lý lỗi database
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Tìm user theo username
   *
   * @param username - Tên đăng nhập cần tìm
   * @returns Promise<Omit<UsersEntity, 'password'> | null> - User nếu tìm thấy (không có password), null nếu không
   *
   * @example
   * const user = await userService.findByUsername("john_doe");
   * if (user) {
   *   console.log("Tìm thấy user:", user.email);
   * }
   */
  async findByUsername(username: string): Promise<Omit<UsersEntity, 'password'> | null> {
    try {
      // Tìm user trong database theo username
      const user = await this.usersRepository.findOne({ where: { username } });
      
      if (!user) {
        return null;
      }

      // Loại bỏ password khỏi response để bảo mật
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new HttpException(
        'Failed to find user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
