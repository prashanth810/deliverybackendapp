import UserModel from "../models/UserModel.js";
import validator from 'validator';
import bcrypt from 'bcrypt';
import { sendMail } from "../config/Sendmail.js";
import { Envs } from "../config/Envs.js";
import CreateToken from "../config/CreateToken.js";

// sing up
const singup = async (req, res) => {
    const { email, phone, password } = req.body;
    try {
        const exist = await UserModel.findOne({ email });
        if (exist) {
            return res.status(400).json({ success: false, message: "User already have an account !!!" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "please enter valid email !!!" })
        }

        if (!validator.isMobilePhone(phone)) {
            return res.status(400).json({ success: false, message: "please enter valid mobile number !!!" });
        }

        if (!validator.isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: "please enter strong password !!!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashpass = await bcrypt.hash(password, salt);

        const user = await UserModel.create({
            email,
            phone,
            password: hashpass,
        });

        // send welcome email
        await sendMail(
            email,
            "Welcome to Delivery App 🎉",
            `<h2>Welcome ${email} <${Envs.EMAIL_USER}> </h2>
            <p>Your account was created successfully.</p>
            <p>Start ordering now 🚀</p>`
        );


        return res.status(201).json({ success: true, message: "sing up success !!!", data: user });

    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// login
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "In valid creadintails !!!" });
        }

        if (!email && !password) {
            return res.status(400).json({ success: false, message: "please provide email or password !!!" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "please enter valid email !!!" });
        }

        if (!validator.isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: "please enter string password !!!" });
        }

        const ispassword = await bcrypt.compare(password, user.password);

        if (!ispassword) {
            return res.status(404).json({ success: false, message: "Invalid email and password !!!" });
        }

        const token = await CreateToken(user._id);

        // Convert to object and delete password
        const userObject = user.toObject();
        delete userObject.password;

        return res.status(200).json({ success: true, message: "Login success", data: userObject, token });

    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

export { singup, login };