import Joi from 'joi';

/**
 * PDF upload validation
 */
export const validatePDFUpload = (file) => {
    const schema = Joi.object({
        mimetype: Joi.string().valid('application/pdf').required(),
        size: Joi.number().max(10485760).required(),
        originalname: Joi.string().required()
    });

    return schema.validate({
        mimetype: file.mimetype,
        size: file.size,
        originalname: file.originalname
    });
};

/**
 * Exam session creation validation
 */
export const validateExamSession = (data) => {
    const schema = Joi.object({
        user_id: Joi.string().required(),
        pdf_id: Joi.string().uuid().required()
    });

    return schema.validate(data);
};

/**
 * Answer submission validation
 */
export const validateAnswerSubmission = (data) => {
    const schema = Joi.object({
        exam_id: Joi.string().uuid().required(),
        answers: Joi.array().items(
            Joi.object({
                question_id: Joi.string().uuid().required(),
                user_answer: Joi.string().required()
            })
        ).required()
    });

    return schema.validate(data);
};

/**
 * Question generation validation
 */
export const validateQuestionGeneration = (data) => {
    const schema = Joi.object({
        pdf_id: Joi.string().uuid().required(),
        num_questions: Joi.number().min(1).max(100).default(10),
        difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
    });

    return schema.validate(data);
};