import AWS from "aws-sdk";
import cuid from "cuid";

const serverless = require("serverless-http");
const express = require("express");
const app = express();
const awsKey = process.env.AWS_ACCESS_KEY_ID
const awsSecret = process.env.AWS_SECRET_ACCESS_KEY

async function initMultipartUpload() {
  const bucket = "indochat-assets"
  const s3 = new AWS.S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
    sessionToken: `session-${cuid()}`
  })

  const params = {
    Bucket: "indochat_asset",
    // 上傳的檔案路徑名稱
    Key: "test-presigned-upload"
  }

  const res = await s3.createMultipartUpload(params).promise()

  console.log(res)
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
