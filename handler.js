'use strict';
const AWS = require("aws-sdk");
const cuid = require("cuid");
const serverless = require("serverless-http");
const express = require("express");
const app = express();
const awsKey = process.env.AWS_ACCESS_KEY_ID
const awsSecret = process.env.AWS_SECRET_ACCESS_KEY
const bucket = "indochat-assets"
const s3 = new AWS.S3({
  accessKeyId: awsKey,
  secretAccessKey: awsSecret,
})

async function initMultipartUpload() {
  const params = {
    Bucket: bucket,
    // 上傳的檔案路徑名稱
    Key: "test-presigned-upload.txt"
  }

  const res = await s3.createMultipartUpload(params).promise()
  return res.UploadId
}

async function generatePresignedUrlParts(parts) {
  const uploadId = "dyj5xp5Z2wbpzN6Xa7JC2h94F_stL2DO6oGHk6WHoRpRV1.D_UerWoecNI6QFN5idcoOQUWbvTZ_rzSIkZ.YC_9H8iJ8q_uvUdWgavQQPBBppaEMZejQriOQAaKCI5MSeF5i2yQyEvIDZylJl_nOdQ--"
  const s3 = new AWS.S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
  })

  const params = {
    Bucket: bucket,
    // 上傳的檔案路徑名稱
    Key: "test-presigned-upload.txt",
    UploadId: uploadId,
    Expires: 6000
  }

  let promises = []

  for (let index = 0; index < parts; index++) {
    promises.push(s3.getSignedUrlPromise('uploadPart', {
      ...params, PartNumber: index + 1
    }))
  }

  const res = await Promise.all(promises)

  return res.reduce((map, part, index) => {
    map[index] = part
    return map
  }, {})
}

async function completeMultiUpload() {
  const uploadId = "dyj5xp5Z2wbpzN6Xa7JC2h94F_stL2DO6oGHk6WHoRpRV1.D_UerWoecNI6QFN5idcoOQUWbvTZ_rzSIkZ.YC_9H8iJ8q_uvUdWgavQQPBBppaEMZejQriOQAaKCI5MSeF5i2yQyEvIDZylJl_nOdQ--"
  const params = {
    Bucket: bucket,
    Key: "test-presigned-upload.txt",
    UploadId: uploadId,
    MultipartUpload: {
      Parts: [
        {
          "ETag": "474105cdbf393ec052b88d960dfc00f3",
          "PartNumber": 1
        },
        {
          "ETag": "d6a3eaee9a43c85c79355b742ea8be27",
          "PartNumber": 2
        }
      ]
    }
  }

  const res = await s3.completeMultipartUpload(params).promise()

  return res
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
module.exports.initMultipartUpload = initMultipartUpload
module.exports.generatePresignedUrlParts = generatePresignedUrlParts
module.exports.completeMultiUpload = completeMultiUpload
