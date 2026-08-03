const joi = require("joi");

const loginSchema = joi.object({
    password:joi.string().min(3).max(30).required(),
    email:joi.string().email().required(),
});

module.exports = {adminSchema,loginSchema};