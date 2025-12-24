import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("🚀 Starting User Schema Migration...");

  const serviceAccountPath = path.resolve(
    __dirname,
    "../keyFirebase.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ firebase-admin-key.json not found!");
    console.error("Expected at:", serviceAccountPath);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  const usersSnapshot = await db.collection("users").get();

  if (usersSnapshot.empty) {
    console.log("❌ No users found.");
    return;
  }

  let updated = 0;
  let batch = db.batch();
  let ops = 0;
  const batchLimit = 400;

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const updateData = {};

    if (!Array.isArray(data.connections)) updateData.connections = [];
    if (!Array.isArray(data.requestsSent)) updateData.requestsSent = [];
    if (!Array.isArray(data.requestsReceived)) updateData.requestsReceived = [];

    if (Object.keys(updateData).length > 0) {
      batch.update(doc.ref, updateData);
      updated++;
      ops++;

      if (ops >= batchLimit) {
        await batch.commit();
        console.log(`✔️ committed ${ops} updates...`);
        batch = db.batch();
        ops = 0;
      }
    }
  }

  if (ops > 0) {
    await batch.commit();
    console.log(`✔️ Final batch committed (${ops})`);
  }

  console.log(`🎉 Migration complete! Updated ${updated} users.`);
}

runMigration()
  .then(() => {
    console.log("✅ Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed", err);
    process.exit(1);
  });
