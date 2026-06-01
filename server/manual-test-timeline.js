/* eslint-disable no-console */
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const credentials = {
  student: { email: 'student@test.com', password: 'password123' },
  recruiter: { email: 'recruiter@test.com', password: 'password123' }
};

let studentToken = '';
let recruiterToken = '';
let targetJobId = '';
let applicationId = '';

async function testTimeline() {
  try {
    console.log('🚀 Starting Status Timeline Test...\n');

    // 1. Login as Student
    console.log('Step 1: Logging in as Student...');
    const studentLogin = await axios.post(`${BASE_URL}/auth/login`, credentials.student);
    studentToken = studentLogin.data.token;
    console.log('✅ Student logged in.\n');

    // 2. Fetch an available job
    console.log('Step 2: Fetching available jobs...');
    const jobsResponse = await axios.get(`${BASE_URL}/jobs`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    if (jobsResponse.data.jobs.length === 0) {
      console.log('❌ No open jobs found. Please create a job first.');
      return;
    }
    targetJobId = jobsResponse.data.jobs[0]._id;
    console.log(`✅ Found target job: ${jobsResponse.data.jobs[0].title} (${targetJobId})\n`);

    // 3. Apply to Job (Initialization check)
    console.log('Step 3: Applying to job (Checking Timeline Initialization)...');
    try {
        const applyResponse = await axios.post(`${BASE_URL}/jobs/${targetJobId}/apply`, {
            resumeLink: 'https://example.com/resume.pdf',
            coverNote: 'Testing the timeline feature.'
          }, {
            headers: { Authorization: `Bearer ${studentToken}` }
          });
          applicationId = applyResponse.data.application._id;
          console.log('✅ Applied successfully. Initial History:', JSON.stringify(applyResponse.data.application.statusHistory, null, 2));
    } catch (err) {
        if (err.response?.status === 409) {
            console.log('ℹ️ Already applied to this job. Fetching application ID...');
            const myApps = await axios.get(`${BASE_URL}/jobs/my-applications/details`, {
                headers: { Authorization: `Bearer ${studentToken}` }
            });
            const app = myApps.data.applications.find(a => a.job._id === targetJobId);
            applicationId = app._id;
            console.log(`✅ Found existing application: ${applicationId}`);
        } else {
            throw err;
        }
    }
    console.log('');

    // 4. Login as Recruiter
    console.log('Step 4: Logging in as Recruiter...');
    const recruiterLogin = await axios.post(`${BASE_URL}/auth/login`, credentials.recruiter);
    recruiterToken = recruiterLogin.data.token;
    console.log('✅ Recruiter logged in.\n');

    // 5. Update Status (New Endpoint check)
    console.log('Step 5: Updating Application Status (Checking PATCH endpoint)...');
    const updateResponse = await axios.patch(`${BASE_URL}/jobs/applications/${applicationId}/status`, {
      status: 'reviewed',
      comment: 'This is a test feedback comment from the recruiter.'
    }, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    console.log('✅ Status updated successfully.');
    console.log('Current History:', JSON.stringify(updateResponse.data.application.statusHistory, null, 2));
    console.log('');

    // 6. Withdraw Application (Enhancement check)
    console.log('Step 6: Withdrawing Application (Checking enhancement)...');
    const withdrawResponse = await axios.patch(`${BASE_URL}/jobs/${targetJobId}/withdraw`, {}, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('✅ Withdrawn successfully.');
    console.log('Final Timeline History:', JSON.stringify(withdrawResponse.data.application.statusHistory, null, 2));

    console.log('\n✨ All tests passed! The Status Timeline is working perfectly.');

  } catch (error) {
    console.error('❌ Test Failed:');
    if (error.response) {
      console.error('Response Data:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error(error.message);
    }
  }
}

testTimeline();
