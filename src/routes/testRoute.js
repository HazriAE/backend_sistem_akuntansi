import express from "express"

export const testing = express.Router()

testing.get("/", (req, res) => {
  res.json({ test: "Hello Guys"});
})