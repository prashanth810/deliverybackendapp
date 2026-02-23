import mongoose from 'mongoose';
import { Envs } from './Envs.js';

const mongo_url = Envs.MONGO_URL;

const Connectiondb = async () => {
    await mongoose.connect(mongo_url).then((result) => {
        console.log("Db connection success 😁😁😁😁😁")
    }).catch((err) => {
        console.log("Db connection failed 😭😭😭😭😭😭", err)
    });
}
export default Connectiondb;