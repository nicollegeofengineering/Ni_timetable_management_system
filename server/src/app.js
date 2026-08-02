import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import DashboardRoutes from "./routes/dashboard.js";
import departmentRoutes from "./routes/department.js";
import staffRoutes from "./routes/staff.js";
import subjectRoutes from "./routes/subjects.js";
import hallRoutes from "./routes/hall.js";
import timetableRoutes from "./routes/timetable.js";
import newsRoutes from "./routes/newsroute.js";
import adminRoutes from "./routes/admission.js";

import {requireAuth} from "./middleware/auth.middleware.js";

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", requireAuth,DashboardRoutes);
app.use("/api/department", requireAuth, departmentRoutes);
app.use("/api/staff", requireAuth, staffRoutes);
app.use("/api/subject", requireAuth, subjectRoutes);
app.use("/api/hall", requireAuth, hallRoutes);
app.use("/api/timetable", requireAuth, timetableRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/admission",adminRoutes);


app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "server error" });
});

export default app;
