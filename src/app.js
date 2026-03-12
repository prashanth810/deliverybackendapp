import express from "express"
import Connectiondb from "./config/Connectiondb.js";
import { Envs } from "./config/Envs.js";
import Categoryroute from "./routes/Categoryroutes.js";
import Userrutes from "./routes/Userroutes.js";
import Productroutes from "./routes/Productroutes.js";
import addressrouter from './routes/Addressroutes.js';
import { razorpayWebhook } from "./utils/Razorpaywebhook.js";
import Orderroutes from "./routes/Orderroutes.js";


const PORT = Envs.PORT || 7050;

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    return res.status(200).json({ success: "Admin back end rudnning !!!" })
})

//login & sign up routes 
app.use("/api/auth", Userrutes);
// adding routes
app.use("/api/auth", Categoryroute);
// product routes
app.use('/api/auth', Productroutes)

// address routes
app.use("/api/auth", addressrouter);

app.use("/api/auth", Orderroutes);

// ⚠️ IMPORTANT: This must be BEFORE express.json() middleware
app.post("/api/v1/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

Connectiondb().then(() => {
    app.listen(PORT, () => {
        console.log("backend listing !!!", PORT);
    })
}).catch((error) => {
    console.log("server connection failed", error)
})