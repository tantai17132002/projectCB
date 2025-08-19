/**
* Các DTO phổ biến cho ứng dụng
*
* Mô-đun này xuất tất cả các DTO phổ biến được sử dụng trên toàn ứng dụng:
* - DTO Phản hồi Lỗi: Dành cho các phản hồi lỗi được chuẩn hóa
* - DTO Phản hồi: Dành cho các phản hồi thành công được chuẩn hóa
*/

// DTO Phản hồi Lỗi - Để xử lý các loại lỗi khác nhau
export * from '@/common/dto/error-response.dto';

// DTO phản hồi - Dành cho các phản hồi API được chuẩn hóa
export * from '@/common/dto/response.dto';
