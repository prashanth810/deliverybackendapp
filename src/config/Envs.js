import dotenv from 'dotenv';
dotenv.config();

const env = process.env;

export const Envs = {
    PORT: env.PORT,
    MONGO_URL: env.MONGO_URL,
    JWT_SECRET: process.env.JWT_SECRET,
};