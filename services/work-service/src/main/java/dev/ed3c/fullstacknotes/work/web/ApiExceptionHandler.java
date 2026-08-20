package dev.ed3c.fullstacknotes.work.web;

import dev.ed3c.fullstacknotes.work.domain.DomainException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public final class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(DomainException.InvalidRequest.class)
    ResponseEntity<ApiError> invalidRequest(DomainException.InvalidRequest exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", exception.getMessage(), request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadableBody(HttpMessageNotReadableException exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "request body is invalid", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> invalidPathOrQuery(MethodArgumentTypeMismatchException exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "request parameter is invalid", request);
    }

    @ExceptionHandler(DomainException.NotFound.class)
    ResponseEntity<ApiError> notFound(DomainException.NotFound exception, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage(), request);
    }

    @ExceptionHandler(DomainException.IdempotencyConflict.class)
    ResponseEntity<ApiError> idempotencyConflict(
            DomainException.IdempotencyConflict exception,
            HttpServletRequest request
    ) {
        return error(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", exception.getMessage(), request);
    }

    @ExceptionHandler(DomainException.VersionConflict.class)
    ResponseEntity<ApiError> versionConflict(DomainException.VersionConflict exception, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "VERSION_CONFLICT", exception.getMessage(), request);
    }

    @ExceptionHandler(DomainException.InvalidTransition.class)
    ResponseEntity<ApiError> invalidTransition(DomainException.InvalidTransition exception, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "INVALID_TRANSITION", exception.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception exception, HttpServletRequest request) {
        log.error("unexpected work-service failure", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "unexpected internal error", request);
    }

    private static ResponseEntity<ApiError> error(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request
    ) {
        Object attribute = request.getAttribute(RequestIdFilter.ATTRIBUTE);
        String requestId = attribute == null ? "unknown" : attribute.toString();
        return ResponseEntity.status(status).body(new ApiError(code, message, requestId, null));
    }
}
