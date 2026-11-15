// The school and university list for student prices (owner, 2026-11-15, like GitHub's): a student picks their school
// when applying; a school's email domains (pccoepune.org) are the ones its students must apply with. The super admin
// adds and edits schools, and a school a student entered by hand can be added when its application is approved.
import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        name_lower: { type: String, index: true },
        domains: { type: [String], default: [] }, // "pccoepune.org": that address and its sub-addresses
        website: { type: String, default: "" },
        kind: { type: String, default: "" },
        students: { type: String, default: "" },
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        country: { type: String, default: "" },
        from_application: { type: mongoose.Schema.Types.ObjectId, ref: "StudentApplication", default: null },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

schoolSchema.pre("save", function () {
    this.name_lower = String(this.name || "").toLowerCase();
});

export default mongoose.models.School || mongoose.model("School", schoolSchema);
