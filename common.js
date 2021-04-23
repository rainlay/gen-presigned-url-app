var AWS = require('aws-sdk');

async function initMultipartUpload() {
    const bucket = "indochat-assets"
    const s3 = new AWS.S3({
        accessKeyId: awsKey,
        secretAccessKey: awsSecret
        // sessionToken: `session-${cuid()}`
    })

    const params = {
        Bucket: "indochat_asset",
        // 上傳的檔案路徑名稱
        Key: "test-presigned-upload"
    }

    const res = await s3.createMultipartUpload(params).promise()

    console.log(res)

    return res
}
