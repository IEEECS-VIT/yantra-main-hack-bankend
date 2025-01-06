import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFile } from 'fs/promises';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
// console.log(__dirname);

const serviceAccountPath = join(__dirname, '../serviceAccountKey.json');
console.log(serviceAccountPath)

try {
    const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.STORAGE_BUCKET
    });

} catch (error) {
    console.error("Error initializing Firebase:", error);
    process.exit(1);
}


export default admin;