import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from "./ConnectDB.js"
import { router as kontakRoute } from "./routes/kontakRoute.js"
import { testing } from "./routes/testRoute.js";

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use(kontakRoute)
app.use("/home", testing)

app.listen(5000, async () => {
  dotenv.config()
  console.log("Mencoba Menghubungkan Server");
  await connectDB();
  
  console.log("Server running on port 5000")
});
