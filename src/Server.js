import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from "./ConnectDB.js"
import { kontakRouter } from "./routes/kontakRoute.js"
import { testing } from "./routes/testRoute.js";
import getCorsConfig from "./config/cors.js";
import { akunRouter } from "./routes/akunRoutes.js";
import { jurnalRouter } from "./routes/jurnalRoutes.js";
import { router as laporanRouter } from "./routes/laporanRoutes.js";

const app = express()

app.use(cors(getCorsConfig()))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use("/api" ,kontakRouter)
app.use("/api", testing)
app.use("/api", akunRouter)
app.use("/api", jurnalRouter)
app.use("/api", laporanRouter)


// if (process.env.NODE_ENV === 'development') {
//   app.use((req, res, next) => {
//     console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
//     next();
//   });
// }

app.listen(5000, async () => {
  dotenv.config()
  console.log("Mencoba Menghubungkan Server");
  await connectDB();
  
  console.log("Server running on port 5000")
});
