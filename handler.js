import AWS from "aws-sdk";

const serverless = require("serverless-http");
const express = require("express");
const app = express();

function initMultipartUpload() {
  const s3 = new AWS.S3({
    accessKeyId: "",
    secretAccessKey: "",
    sessionToken: ""
  })
}

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

app.get("/hello", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from path!",
  });
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports.handler = serverless(app);
