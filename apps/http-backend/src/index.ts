import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import connectDB from "./db/index";

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is running at port ${process.env.PORT}`);
        
    })
})