// A student's application for student prices (owner, 2026-11-15, like GitHub's): their school, the school email they
// confirmed on their account (when the school gives one), and a document that shows they study there. A super admin
// reviews it (within 2 days) and approves or rejects it; the user gets an email either way. The document is kept
// privately and deleted 30 days after the decision.
import mongoose from "mongoose";

const studentApplicationSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        user_email: { type: String, default: "" },
        user_name: { type: String, default: "" },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
        school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
        school: {
            name: { type: String, default: "" },
            listed: { type: Boolean, default: false }, // picked from the school list (else typed by the student)
            domains: { type: [String], default: [] }, // the listed school's domains, or the one the student gave
            website: { type: String, default: "" },
            kind: { type: String, default: "" },
            students: { type: String, default: "" },
            street: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            country: { type: String, default: "" },
        },
        school_email: { type: String, default: null }, // a confirmed email of the account; null = the school gives none
        document: {
            key: { type: String, default: "" },
            name: { type: String, default: "" },
            mime: { type: String, default: "" },
            size: { type: Number, default: 0 },
        },
        document_delete_after: { type: Date, default: null, index: true },
        document_deleted_at: { type: Date, default: null },
        document_delete_claimed_until: { type: Date, default: null },
        submitted_at: { type: Date, default: Date.now },
        decided_at: { type: Date, default: null },
        decided_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        decided_by_email: { type: String, default: "" },
        reject_reason: { type: String, default: "" },
        added_school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    },
    { timestamps: true }
);

// One pending application per student, kept by the database (two sent at once: the second is refused)
studentApplicationSchema.index({ user_id: 1 }, { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_per_user" });

export default mongoose.models.StudentApplication || mongoose.model("StudentApplication", studentApplicationSchema);
