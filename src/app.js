import express from "express"
import Connectiondb from "./config/Connectiondb.js";
import { Envs } from "./config/Envs.js";
import Categoryroute from "./routes/Categoryroutes.js";
import Userrutes from "./routes/Userroutes.js";
import Productroutes from "./routes/Productroutes.js";


const PORT = Envs.PORT;

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

Connectiondb().then(() => {
    app.listen(PORT, () => {
        console.log("backend listing !!!");
    })
}).catch((error) => {
    console.log("server connection failed", error)
})