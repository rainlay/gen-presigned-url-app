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

async function initMultipartUpload(userId, bucket, extension) {
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

async function generatePresignedUrlParts(uploadId, number, bucket, key, expire) {
  const params = {
    Bucket: bucket,
    // 上傳的檔案路徑名稱
    Key: key,
    UploadId: uploadId,
    Expires: expire
  }

  let promises = []

  for (let index = 0; index < number; index++) {
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

async function batchGeneratePresignedUrl(userId, number, bucket, extension, expire) {
  const date = new Date()
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1

  let result = []
  for (let i = 0; i < number; i++) {
    let guid = cuid()
    let filepath = util.format('%s/user/%s/files/%s/%s/%s.%s', ENVIROMENT, userId, y, m, guid, extension);
    let params = {
      Bucket: bucket,
      // 上傳的檔案路徑名稱
      Key: filepath,
      Expires: expire
    }

    let url = s3.getSignedUrl('putObject', params)

    let data = {
      filepath: filepath,
      url: url
    }

    result.push(data)
  }

  return result
}

async function completeMultiUpload(uploadId, bucket, filepath, parts) {
  const params = {
    Bucket: bucket,
    Key: filepath,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts
      // Parts: [
      //   {
      //     "ETag": "474105cdbf393ec052b88d960dfc00f3",
      //     "PartNumber": 1
      //   },
      //   {
      //     "ETag": "d6a3eaee9a43c85c79355b742ea8be27",
      //     "PartNumber": 2
      //   }
      // ]
    }
  }

  try {
    const result = await s3.completeMultipartUpload(params).promise()
    return result
  } catch (err) {
    throw err
  }
}

// GeneratePresignedUrlParts
// request: parts, extension
// 分段上傳檔案流程：
// 1. 取得欲分段上傳檔案之 upload id
// 2. 產生檔案的分段上傳連結
// TODO User ID 驗證
app.post("/v1/upload/gen-presigned-url-parts", body('user_id').isNumeric(), ash(async (req, res) => {
  const errors = validationResult(req);
  // TODO error response 調整
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }

  const number = req.body.number
  const extension = req.body.extension
  const userId = req.body.user_id

  try {
    // 1. 取得欲分段上傳檔案之 upload id
    const uploadData = await initMultipartUpload(userId, extension, INDOCHAT_BUCKET)
    // 2. 產生檔案的分段上傳連結
    const presignedUrls = await generatePresignedUrlParts(uploadData.upload_id, number, INDOCHAT_BUCKET, uploadData.key, 6000)
    return res.status(200).json(
        {
          'upload_id': uploadData.upload_id,
          'filepath': uploadData.key,
          'urls': presignedUrls,
        }
    );
  } catch (err) {
    return res.status(500).json({
      "errors": err.message
    });
  }
}));

// CompleteMultiUpload
// 完成分段上傳，上傳完各個分段上傳的檔案後，須通知 s3 將分段的檔案合而為一成原始檔案
// TODO User ID 驗證
app.post("/v1/upload/complete-multi-upload", ash(async (req, res) => {
  const parts = req.body.parts
  const userId = req.body.user_id
  const filepath = req.body.filepath
  const uploadId = req.body.upload_id

  try {
    let result = await completeMultiUpload(uploadId, INDOCHAT_BUCKET, filepath, parts)
    return res.status(200).json(result)
  } catch (err) {
    return res.status(err.statusCode).json({
      'message': err.code
    })
  }
}))

app.post("/v1/upload/gen-presigned-url", ash(async (req, res) => {

  try {
    const result = await batchGeneratePresignedUrl(1, 1, INDOCHAT_BUCKET, "jpg", 60)
    return res.status(200).json({})
  } catch (err) {
    return res.status(500).json({})
  }
}))

// app.get("/", (req, res, next) => {
//   return res.status(200).json({
//     message: "Hello from root!",
//   });
// });
//
// app.get("/hello", (req, res, next) => {
//   return res.status(200).json({
//     message: "Hello from path!",
//   });
// });

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports.initMultipartUpload = initMultipartUpload
module.exports.generatePresignedUrlParts = generatePresignedUrlParts
module.exports.completeMultiUpload = completeMultiUpload
module.exports.generatePresingedUrl = batchGeneratePresignedUrl

module.exports.handler = serverless(app);
