/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = "6b98bf938dfdbbc72a0b4b5a5cac1921";
const accessKeyId = "061cbc7ecde886384cffdea0fbf642ff";
const secretAccessKey = "4f17ce3f7a8498419abbd97ab1118934031048cfd555b0074e2e5a65de444f99";

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
});

const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>Hacker Site</title><style>body { background-color: black; color: #00ff00; font-family: monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-size: 24px; }</style></head>
<body>
    <h1>System Compromised. Hosted on R2.</h1>
</body>
</html>
`;

async function upload() {
    try {
        console.log("Uploading to websites/hacker/index.html...");
        await s3Client.send(new PutObjectCommand({
            Bucket: "classgrid-storage",
            Key: "websites/hacker/index.html",
            Body: htmlContent,
            ContentType: "text/html"
        }));
        console.log("SUCCESS! The site is now live at https://hacker.sites.classgrid.in");
    } catch (e) {
        console.error("Upload failed:", e);
    }
}

upload();
