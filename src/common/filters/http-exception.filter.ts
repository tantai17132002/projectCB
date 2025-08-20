import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';

/**
 * HttpExceptionFilter - Filter xử lý tất cả các exception toàn cục
 *
 * Filter này sẽ bắt và xử lý tất cả các exception trong ứng dụng:
 * - HttpException từ NestJS
 * - Database errors từ TypeORM
 * - Validation errors
 * - Authentication/Authorization errors
 * - Custom business logic errors
 *
 * Mục đích:
 * - Chuẩn hóa format response error
 * - Log lỗi để debug
 * - Ẩn thông tin nhạy cảm trong production
 * - Cung cấp thông tin hữu ích cho client
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Xử lý exception khi được throw trong ứng dụng
   *
   * @param exception - Exception được throw
   * @param host - ArgumentsHost chứa thông tin request/response
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Lấy thông tin request để log
    const { method, url, body, user } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    // Xác định status code và message dựa trên loại exception
    const { status, message, error } = this.getExceptionInfo(exception);

    // Log lỗi với thông tin chi tiết
    this.logError(exception, {
      method,
      url,
      body,
      user,
      userAgent,
      ip,
      status,
      message,
    });

    // Tạo response error chuẩn hóa
    const errorResponse = this.createErrorResponse(status, message, error, request);

    // Trả về response cho client
    response.status(status).json(errorResponse);
  }

  /**
   * Phân tích exception để lấy thông tin status, message và error
   *
   * @param exception - Exception cần phân tích
   * @returns Object chứa status, message và error
   */
  private getExceptionInfo(exception: unknown): {
    status: number;
    message: string;
    error?: string;
  } {
    // Xử lý HttpException từ NestJS (bao gồm UnauthorizedException, NotFoundException, ConflictException, ForbiddenException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // Xử lý response có thể là string hoặc object
      if (typeof response === 'string') {
        return { status, message: response };
      }

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;
        return {
          status,
          message: responseObj.message || exception.message,
          error: responseObj.error,
        };
      }

      return { status, message: exception.message };
    }

    // Xử lý TypeORM QueryFailedError (database constraint violations)
    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception);
    }

    // Xử lý EntityNotFoundError (record not found)
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'EntityNotFoundError',
      };
    }

    // Xử lý TypeORMError chung
    if (exception instanceof TypeORMError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        error: 'TypeORMError',
      };
    }

    // Xử lý ValidationError từ class-validator
    if (this.isValidationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'ValidationError',
      };
    }

    // Xử lý các exception khác
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: exception.name,
      };
    }

    // Fallback cho unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'UnknownError',
    };
  }

  /**
   * Xử lý database errors từ TypeORM
   *
   * @param exception - QueryFailedError từ TypeORM
   * @returns Object chứa status, message và error
   */
  private handleDatabaseError(exception: QueryFailedError): {
    status: number;
    message: string;
    error?: string;
  } {
    const errorCode = (exception as any).code;

    // Xử lý các lỗi PostgreSQL phổ biến
    switch (errorCode) {
      case '23505': // unique_violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
          error: 'UniqueConstraintViolation',
        };

      case '23503': // foreign_key_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referenced resource does not exist',
          error: 'ForeignKeyViolation',
        };

      case '23502': // not_null_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
          error: 'NotNullViolation',
        };

      case '23514': // check_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Data validation failed',
          error: 'CheckViolation',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'DatabaseError',
        };
    }
  }

  /**
   * Kiểm tra xem exception có phải là ValidationError không
   *
   * @param exception - Exception cần kiểm tra
   * @returns true nếu là ValidationError
   */
  private isValidationError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'ValidationError' ||
        exception.message.includes('validation') ||
        exception.message.includes('Validation'))
    );
  }

  /**
   * Log lỗi với thông tin chi tiết
   *
   * @param exception - Exception gốc
   * @param context - Thông tin context của request
   */
  private logError(
    exception: unknown,
    context: {
      method: string;
      url: string;
      body: any;
      user: any;
      userAgent: string;
      ip: string;
      status: number;
      message: string;
    },
  ) {
    const { method, url, body, user, userAgent, ip, status, message } = context;

    // Log level dựa trên status code
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';

    const logMessage = {
      timestamp: new Date().toISOString(),
      method,
      url,
      status,
      message,
      user: user?.id || 'anonymous',
      ip,
      userAgent,
      body: this.sanitizeBody(body),
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    this.logger[logLevel]('HTTP Exception', logMessage);
  }

  /**
   * Làm sạch body request để loại bỏ thông tin nhạy cảm
   *
   * @param body - Request body
   * @returns Body đã được làm sạch
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Tạo response error chuẩn hóa
   *
   * @param status - HTTP status code
   * @param message - Error message
   * @param error - Error type
   * @param request - Request object
   * @returns Error response object
   */
  private createErrorResponse(status: number, message: string, error?: string, request?: Request) {
    const response: any = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request?.url,
    };

    // Thêm error type nếu có
    if (error) {
      response.error = error;
    }

    // Thêm validation errors nếu có
    if (status === HttpStatus.BAD_REQUEST && request?.body) {
      response.details = this.extractValidationDetails(request.body);
    }

    // Thêm request ID nếu có
    if (request?.headers['x-request-id']) {
      response.requestId = request.headers['x-request-id'];
    }

    return response;
  }

  /**
   * Trích xuất chi tiết validation errors từ request body
   *
   * @param body - Request body
   * @returns Validation details
   */
  private extractValidationDetails(body: any): any {
    // Nếu body có validation errors từ class-validator
    if (body && Array.isArray(body.message)) {
      return body.message.map((error: any) => ({
        field: error.property,
        message: error.constraints ? Object.values(error.constraints)[0] : error.message,
        value: error.value,
      }));
    }

    // Nếu body có validation errors dạng object
    if (body && typeof body === 'object' && body.errors) {
      return body.errors;
    }

    return null;
  }
}
