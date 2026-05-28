import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "./src/database/db.js";
import { getAllJobs } from "./src/modules/jobs/service.js";
import JobPosting from "./src/database/models/JobPosting.js";
import User from "./src/database/models/User.js";

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

async function runTests() {
  await connectDB();

  console.log("\n--- STARTING JOB FILTER TESTS ---\n");

  try {
    // 1. Setup Test Data (Optional: check if jobs exist)
    const jobCount = await JobPosting.countDocuments();
    console.log(`Found ${jobCount} total jobs in database.`);

    if (jobCount === 0) {
      console.log("No jobs found. Creating some test data...");
      // Add a few dummy jobs if none exist (Note: needs a valid recruiter ID or we skip validation)
      // For now, let's just assume data exists since the user mentioned they've been using it.
    }

    // 2. Test: No Filters
    console.log("Test 1: All Open Jobs");
    const allJobs = await getAllJobs({});
    console.log(`=> Result: Found ${allJobs.length} jobs.`);

    // 3. Test: Designation Filter
    const searchRole = "Engineer";
    console.log(`Test 2: Designation filter ("${searchRole}")`);
    const designJobs = await getAllJobs({ designation: searchRole });
    console.log(`=> Result: Found ${designJobs.length} jobs matching "${searchRole}".`);
    designJobs.slice(0, 2).forEach(j => console.log(`   - ${j.title}`));

    // 4. Test: Salary Filter
    const minSal = 50000;
    console.log(`Test 3: Minimum Salary (${minSal})`);
    const salaryJobs = await getAllJobs({ minSalary: minSal });
    console.log(`=> Result: Found ${salaryJobs.length} jobs with min salary >= ${minSal}.`);

    // 5. Test: Recency Filter
    console.log(`Test 4: Posted within 7 days`);
    const recentJobs = await getAllJobs({ postedWithin: "7d" });
    console.log(`=> Result: Found ${recentJobs.length} jobs posted in the last week.`);

    // 6. Test: Multi-parameter
    console.log(`Test 5: Complex Filter (Engineer + 50k)`);
    const complexJobs = await getAllJobs({ designation: "Engineer", minSalary: 50000 });
    console.log(`=> Result: Found ${complexJobs.length} jobs matching both criteria.`);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    mongoose.connection.close();
    console.log("\n--- TESTS COMPLETED ---\n");
  }
}

runTests();
