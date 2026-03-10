import jwt from 'jsonwebtoken';
import { Envs } from './Envs.js';

const CreateToken = async (id) => {
    return jwt.sign({ id }, Envs.JWT_SECRET, { expiresIn: "2d" });
}

export default CreateToken;