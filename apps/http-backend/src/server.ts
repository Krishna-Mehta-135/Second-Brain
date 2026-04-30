import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { app } from "./app";
import connectDB from "./db/index";

const port = process.env.HTTP_PORT || 8000;

connectDB()
.then(() => {
    app.listen(port , () => {
        console.log(`Server is running at port ${port}`);
    })
})
.catch((err) => {
    console.log("Database connection failed", err);
});