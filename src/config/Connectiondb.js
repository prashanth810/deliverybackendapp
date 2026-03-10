import mongoose from 'mongoose';
import { Envs } from './Envs.js';

const mongo_url = Envs.MONGO_URL;

let isConnected = false;

const Connectiondb = async () => {
    if (isConnected) {
        console.log("Reusing existing DB connection ✅");
        return;
    }

    try {
        const db = await mongoose.connect(mongo_url, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = db.connections[0].readyState;
        console.log("Db connection success 😁😁😁😁😁");
    } catch (err) {
        console.log("Db connection failed 😭😭😭😭😭😭", err);
        throw err;
    }
};

export default Connectiondb;