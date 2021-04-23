const handler = require('../handler');

test("just test", async () => {
    let res = await handler.initMultipartUpload()
    console.log(res)
})

test("just test2", async () => {
    let res = await handler.generatePresignedUrlParts(2)
    for (let prop in res) {
        console.log(prop);
        console.log(res[prop]);
    }
})

test("complete multi upload", async () => {
    let res = await handler.completeMultiUpload()
    console.log(res)
})
