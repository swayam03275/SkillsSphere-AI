/* eslint-disable no-console */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from server/.env
dotenv.config({ path: path.join(process.cwd(), ".env") });

import Notification from "../src/database/models/Notification.js";
import MatchResult from "../src/database/models/MatchResult.js";

/**
 * Sweeps the Notifications collection for "skill_gap_alert" records.
 * If the related MatchResult cannot be found for the given studentId and jobId,
 * the notification is considered an "orphan" (due to a past silent failure)
 * and is deleted.
 */
export const runReconciliation = async () => {
  console.log("Starting reconciliation job for orphaned notifications...");
  
  if (mongoose.connection.readyState !== 1) {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI not found in environment variables.");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
  }

  let orphansDeleted = 0;

  try {
    // 1. Find all skill_gap_alert notifications
    // These require relatedData.studentId and relatedData.jobId to be valid
    const notifications = await Notification.find({ type: "skill_gap_alert" });

    console.log(`Found ${notifications.length} skill_gap_alert notifications to verify.`);

    for (const notif of notifications) {
      const { studentId, jobId } = notif.relatedData || {};
      
      if (!studentId || !jobId) {
        console.warn(`Notification ${notif._id} is missing studentId or jobId. Skipping.`);
        continue;
      }

      // 2. Check if a corresponding MatchResult exists.
      // The MatchResult must belong to the user (studentId) and have a recommendation for this job
      const matchResultExists = await MatchResult.exists({
        user: studentId,
        "recommendations.job": jobId
      });

      // 3. If no match result exists, this notification is an orphan
      if (!matchResultExists) {
        await Notification.findByIdAndDelete(notif._id);
        orphansDeleted++;
        console.log(`Deleted orphaned notification ${notif._id} (User: ${studentId}, Job: ${jobId})`);
      }
    }

    console.log(`Reconciliation complete. Successfully deleted ${orphansDeleted} orphaned notifications.`);
  } catch (error) {
    console.error("Error during reconciliation job:", error);
  } finally {
    // If run as a standalone script, disconnect
    if (import.meta.url === `file://${process.argv[1]}`) {
      await mongoose.disconnect();
      process.exit(0);
    }
  }
};

// Auto-run if executed directly via Node
if (import.meta.url === `file://${process.argv[1]}`) {
  runReconciliation();
}
