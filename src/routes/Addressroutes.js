import express from 'express';
import {
    getAllAddresses,
    getAddressById,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} from "../controllers/AddressController.js";

const addressrouter = express.Router();

addressrouter.get('/getaddress', getAllAddresses)
addressrouter.get('/address/:id', getAddressById);
addressrouter.post("/address/create", createAddress);

addressrouter.put('/address/:id', updateAddress);
addressrouter.delete("/address/:id", deleteAddress);

addressrouter.patch('/address/:id/set-default', setDefaultAddress);


export default addressrouter;