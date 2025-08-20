import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosService } from '@/modules/todos/todos.service';
import { TodosController } from '@/modules/todos/todos.controller';
import { TodoEntity } from '@/modules/todos/entities/todo.entity';
import { CustomLogger } from '@/common/logger/custom-logger.service';

/**
 * TodosModule - Module quản lý chức năng Todos
 *
 * Module này định nghĩa cấu trúc và dependencies cho tính năng quản lý todos:
 * - Import TypeORM repository cho TodoEntity
 * - Khai báo controller để xử lý HTTP requests
 * - Khai báo service để xử lý business logic
 *
 * Cấu trúc module theo kiến trúc NestJS:
 * - imports: Các module khác cần thiết
 * - controllers: Các controller xử lý HTTP requests
 * - providers: Các service và dependency injection
 */
@Module({
  /**
   * imports: Import các module cần thiết
   * TypeOrmModule.forFeature([TodoEntity]) - Đăng ký TodoEntity với TypeORM
   * Cho phép inject Repository<TodoEntity> trong service
   */
  imports: [TypeOrmModule.forFeature([TodoEntity])],

  /**
   * controllers: Khai báo các controller của module
   * TodosController - Xử lý các HTTP endpoints cho todos
   * NestJS sẽ tự động tạo instance và inject dependencies
   */
  controllers: [TodosController],

  /**
   * providers: Khai báo các service và dependency injection
   * TodosService - Service xử lý business logic cho todos
   * CustomLogger - Trình ghi nhật ký tùy chỉnh cho todos operations
   * Có thể inject vào controller và các service khác
   */
  providers: [TodosService, CustomLogger],
})
export class TodosModule {}
