import express from 'express';
import { login, singup, getprofile, Allusers, Handlegooglelogin } from '../controllers/Authcontroller.js';
import Authmiddleware from '../middlewares/Authmiddleware.js';

const Userrutes = express.Router();

Userrutes.post("/register", singup)
Userrutes.post("/login", login);
Userrutes.get("/profile", Authmiddleware, getprofile);
Userrutes.get("/getallusers", Allusers);
Userrutes.post("/googlelogin", Handlegooglelogin);


export default Userrutes;