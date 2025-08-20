# Database Migrations

Thư mục này chứa các file migration của TypeORM để quản lý schema database.

## Cách sử dụng

### 1. Tạo migration mới
```bash
# Tạo migration từ entities hiện tại
npm run migration:generate -- src/migrations/CreateUsersTable

# Tạo migration trống
npm run migration:create -- src/migrations/CreateUsersTable
```

### 2. Chạy migrations
```bash
# Chạy tất cả migrations chưa được áp dụng
npm run migration:run

# Revert migration cuối cùng
npm run migration:revert
```

### 3. Xem trạng thái migrations
```bash
# Xem danh sách migrations đã chạy
npm run migration:show
```

## Lưu ý quan trọng

1. **Không bao giờ sửa file migration đã commit**
2. **Luôn test migration trên database test trước**
3. **Backup database trước khi chạy migration trên production**
4. **Migrations chạy theo thứ tự timestamp**

## Cấu trúc file migration

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1234567890123 implements MigrationInterface {
    name = 'CreateUsersTable1234567890123'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Code tạo bảng/column
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Code xóa bảng/column (rollback)
    }
}
```
