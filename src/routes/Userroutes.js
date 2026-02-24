import express from 'express';
import { login, signup } from '../controllers/Authcontroller.js';

const Userrutes = express.Router();

Userrutes.post("/register", signup)
Userrutes.post("/login", login)


export default Userrutes;