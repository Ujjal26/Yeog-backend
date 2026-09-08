/**
 * @file validators.js
 * @description Input validation schemas using Joi.
 * Used for validating incoming request body payloads for authentication.
 */

const joi = require("joi");

/**
 * Joi validation schema for user/admin login request body.
 * @type {import('joi').ObjectSchema}
 */
const loginSchema = joi.object({
    password: joi.string().min(3).max(30).required(),
    email: joi.string().email().required(),
});

module.exports = { loginSchema };