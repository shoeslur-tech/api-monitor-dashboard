const express = require("express");
const cors = require("cors");
const { router: monitorRoutes, startMonitorChecks } = require("./routes/monitors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("My server is running!");
});

app.get("/hello", (req, res) => {
  res.send("Hello from my API");
});

app.use("/api/monitors", monitorRoutes);

startMonitorChecks();

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});