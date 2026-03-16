import UserModel from "../models/UserModel.js";
import validator from 'validator';
import bcrypt from 'bcrypt';
import { sendMail } from "../config/Sendmail.js";
import { Envs } from "../config/Envs.js";
import CreateToken from "../config/CreateToken.js";
import pkg from 'google-auth-library';
const { OAuth2Client } = pkg;

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

// get profile data by token 
const getprofile = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({ success: false, message: "User not exist !!!" });
        }

        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// get all user for admin
const Allusers = async (req, res) => {
    try {
        const user = req.user;
        const users = await UserModel.find({});
        if (!users) {
            return res.status(404).json({ success: false, message: "No users found !!!" });
        }
        // if (!user.role === "ADMIN") {
        //     return res.status(403).json({ success: false, message: "Admin only access !!!" });
        // }

        return res.status(200).json({ success: true, data: users });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const client = new OAuth2Client(Envs.GOOGLE_CLIENT_ID);

const Handlegooglelogin = async (req, res) => {
    const { idToken } = req.body;
    try {
        if (!idToken) {
            return res.status(400).json({ success: false, message: "Google token is required !!!" });
        }

        // ✅ Bug 2 fixed — verifyIdToken not verifyToken
        // ✅ Bug 3 fixed — renamed to ticket
        const ticket = await client.verifyIdToken({
            idToken,
            audience: Envs.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload; // ✅ destructure here

        let user = await UserModel.findOne({ email }); // ✅ findOne not find

        if (!user) {
            user = await UserModel.create({
                email,
                name,
                avatar: picture,
                phone: "",
                password: "",
                googleAuth: true,
            });

            await sendMail(
                email,
                "Welcome to Delivery App 🎉",
                `<h2>Welcome ${name}</h2>
                <p>Your account was created with Google.</p>
                <p>Start ordering now 🚀</p>`
            );
        }

        // ✅ Bug 1 fixed — renamed to jwtToken (no duplicate const token)
        const jwtToken = await CreateToken(user._id);

        const userObject = user.toObject();
        delete userObject.password;

        return res.status(200).json({ success: true, message: "Google login success", data: userObject, token: jwtToken });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
export { singup, login, getprofile, Allusers, Handlegooglelogin };