import express from "express"
import Connectiondb from "./config/Connectiondb.js";
import { Envs } from "./config/Envs.js";
import Categoryroute from "./routes/Categoryroutes.js";


const PORT = Envs.PORT;

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    return res.status(200).json({ success: "Admin back end rudnning !!!" })
})

// adding routes
app.use("/api/auth", Categoryroute);

Connectiondb().then(() => {
    app.listen(PORT, () => {
        console.log("backend listing !!!");
    })
}).catch((error) => {
    console.log("server connection failed", error)
})