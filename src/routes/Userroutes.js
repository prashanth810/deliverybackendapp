import express from 'express';
import { login, singup } from '../controllers/Authcontroller.js';

const Userrutes = express.Router();

Userrutes.post("/register", singup)
Userrutes.post("/login", login)


export default Userrutes;