/**
 * Success response
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Error response
 */
export const errorResponse = (res, error, statusCode = 400) => {
    const message = error.message || 'An error occurred';
    const status = statusCode >= 500 ? 500 : statusCode;

    return res.status(status).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
    });
};

/**
 * Validation error response
 */
export const validationErrorResponse = (res, errors) => {
    return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
    });
};

/**
 * Paginated response
 */
export const paginatedResponse = (res, data, page, limit, total) => {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        },
        timestamp: new Date().toISOString()
    });
  };