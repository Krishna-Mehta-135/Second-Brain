import http from "http";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log("No user");

  // Generate token like auth controller does
  const token = jwt.sign(
    { id: user.id },
    "your_jwt_secret_here" /* from .env.example */,
    { expiresIn: "1h" },
  );

  const data = JSON.stringify({
    title: "Untitled",
    link: "https://internal.doc",
    type: "document",
    tags: [],
  });

  const options = {
    hostname: "127.0.0.1",
    port: 9898,
    path: "/api/v1/content",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      Authorization: `Bearer ${token}`,
    },
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let chunks = "";
    res.on("data", (d) => {
      chunks += d;
    });
    res.on("end", () => {
      console.log(chunks);
    });
  });

  req.on("error", (error) => {
    console.error(error);
  });

  req.write(data);
  req.end();
}
run();
