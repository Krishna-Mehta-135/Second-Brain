import "./env.js";
import { app } from "./app.js";
import connectDB from "./db/index.js";

const port = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 8000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 Server is running at http://localhost:${port}`);
      console.log(`🔌 API Base URL: http://localhost:${port}/api/v1`);
    });
  })
  .catch((err) => {
    console.log("Database connection failed", err);
  });
