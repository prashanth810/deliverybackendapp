import dotenv from 'dotenv';
dotenv.config();

const env = process.env;

export const Envs = {
    PORT: env.PORT,
    MONGO_URL: env.MONGO_URL,
    JWT_SECRET: process.env.JWT_SECRET,

    // upload images in cloudinary 
    CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,

    // # send email
    EMAIL_USER: env.EMAIL_USER,
    EMAIL_HOST: env.EMAIL_HOST,
    EMAIL_PASS: env.EMAIL_PASS,
};