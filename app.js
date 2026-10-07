require("dotenv/config");
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 8080;

const indexRouter = require("./routes/indexRouter");

// 1. Standard API Middleware
app.use(cors()); // Allows your React tfrontend to connect o this API
app.use(express.json()); // Essential: parses JSON bodies sent in requests
app.use(express.urlencoded({ extended: true }));

// 2. Static File Serving (for blog post image uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 3. API Routes
app.use("/api", indexRouter);

// 4. Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(PORT, () => {
  console.log(`Blog API listening on port ${PORT}!`);
});