'use strict';
const AWS = require("aws-sdk");
const AWS_KEY = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY
const ENVIROMENT = process.env.ENVIROMENT
const INDOCHAT_BUCKET = "indochat-assets"
const cuid = require("cuid");
const serverless = require("serverless-http");
const express = require("express");
const util = require("util")
const R = require('ramda');
const s3 = new AWS.S3({
  accessKeyId: AWS_KEY,
  secretAccessKey: AWS_SECRET,
})

const app = express();
const { body, validationResult } = require('express-validator');
const ash = require('express-async-handler')
app.use(express.json())

async function initMultipartUpload(userId, extension, bucket) {
  const guid = cuid()
  const date = new Date()
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1

  // S3 檔案路徑格式
  // Environment(localhost|development|staging|production) + /user/{user_id}/files/yyyy/mm/{uuid.extension}
  let key = util.format('%s/user/%s/files/%s/%s/%s.%s', ENVIROMENT, userId, y, m, guid, extension);

  const params = {
    "Bucket": bucket,
    // 上傳的檔案路徑名稱
    "Key": key,
    "ACL": 'public-read'
  }

  const res = await s3.createMultipartUpload(params).promise()

  return {
    upload_id: res.UploadId,
    key: key
  }
}

async function generatePresignedUrlParts(uploadId, parts, bucket, key, expire) {
  const params = {
    Bucket: bucket,
    // 上傳的檔案路徑名稱
    Key: key,
    UploadId: uploadId,
    Expires: expire
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
   }, [])

  // return res.reduce((map, part, index) => {
  //   map[index] = part
  //   return map
  // }, {})
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

// GeneratePresignedUrlParts
// request: parts, extension
// 分段上傳檔案流程：
// 1. 取得欲分段上傳檔案之 upload id
// 2. 產生檔案的分段上傳連結
app.post("/upload/gen-presigned-url-parts", body('user_id').isNumeric(), ash(async (req, res) => {
  const errors = validationResult(req);
  // TODO error response 調整
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }

  const parts = req.body.parts
  const extension = req.body.extension
  const userId = req.body.user_id
  // 1. 取得欲分段上傳檔案之 upload id
  const uploadData = await initMultipartUpload(userId, extension, INDOCHAT_BUCKET)

  // 2. 產生檔案的分段上傳連結
  const presignedUrls = await generatePresignedUrlParts(uploadData.upload_id, parts, INDOCHAT_BUCKET, uploadData.key, 6000)
  return res.status(200).json(
      {
        'filepath': uploadData.key,
        'urls': presignedUrls
      }
  );
}));

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

module.exports.initMultipartUpload = initMultipartUpload
module.exports.generatePresignedUrlParts = generatePresignedUrlParts
module.exports.completeMultiUpload = completeMultiUpload

module.exports.handler = serverless(app);
