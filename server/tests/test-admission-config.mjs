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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from './src/models/Organization.js';
import { getAdmissionConfig, updateAdmissionConfig } from './src/controllers/admission-config.controller.js';

dotenv.config();

async function runTests() {
  console.log("=========================================");
  console.log("🧪 TESTING ADMISSION CONFIGURATION CONTROLLER");
  console.log("=========================================\n");

  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classgrid");
    console.log("✅ Connected to MongoDB");

    // Get any existing organization
    const org = await Organization.findOne({});
    if (!org) {
      throw new Error("No organization found in DB. Please run seed script first.");
    }
    console.log(`✅ Using Organization: ${org.name} (${org._id})`);

    const mockReq = {
      user: {
        organization_id: org._id,
        _id: 'mock_user_id',
        role: 'org_admin'
      },
      body: {}
    };

    let responseData = null;
    const mockRes = {
      json: (data) => { responseData = data; },
      status: (code) => ({
        json: (data) => { responseData = { status: code, ...data }; }
      })
    };

    // 1. Fetch Admission Config
    console.log("\n1. Testing GET Admission Config...");
    await getAdmissionConfig(mockReq, mockRes);
    
    if (responseData.error) throw new Error(responseData.error);
    console.log(`✅ Config fetched.`);
    console.log(`   Organization: ${responseData.organization}`);
    console.log(`   Structure Type: ${responseData.structure_type}`);
    console.log(`   Current Registration Fee: ${responseData.config?.registration_fee || 'Not set'}`);

    // 2. Update Admission Config (Simulating Form Builder changes)
    console.log("\n2. Testing PATCH Admission Config...");
    
    mockReq.body = {
      admission_config: {
        ...responseData.config,
        form_builder_config: {
          field_toggles: [
            { key: "aadhar_number", admission: true, onboarding: true, is_required: true },
            { key: "blood_group", admission: true, onboarding: true, is_required: false }
          ],
          document_toggles: [
            { key: "photo", admission: true, onboarding: true }
          ],
          custom_fields: [
            {
              field_key: "custom_hostel",
              field_label: "Do you need hostel accommodation?",
              field_type: "select",
              options: ["Yes", "No"],
              is_required: true,
              admission: true,
              onboarding: true
            }
          ]
        }
      }
    };

    let patchResponseData = null;
    const patchMockRes = {
      json: (data) => { patchResponseData = data; },
      status: (code) => ({
        json: (data) => { patchResponseData = { status: code, ...data }; }
      })
    };

    await updateAdmissionConfig(mockReq, patchMockRes);

    if (patchResponseData.error) {
      console.error("❌ Failed to update config:", patchResponseData);
    } else {
      console.log("✅ Config updated successfully!");
      console.log(`   Message: ${patchResponseData.message}`);
      console.log(`   Saved Custom Fields: ${patchResponseData.config?.form_builder_config?.custom_fields?.length}`);
      console.log(`   Custom Field Label: ${patchResponseData.config?.form_builder_config?.custom_fields?.[0]?.field_label}`);
    }

    console.log("\n✅ ALL CONFIGURATION TESTS PASSED!");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
