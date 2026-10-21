# ERP backend (shut down)

The old Classgrid ERP API: attendance, exams, quizzes, marks, fees, admissions operations, payroll,
canteen, library, results, timetable, live classes, org websites and the ERP workers/crons
(attendance, admission deadlines, promotions, monthly invoices, org usage, email provisioning).

It was moved out of `server/` so the live products (chat.classgrid.in and the super admin dashboard)
only load what they use. Files keep their original paths (`erp-backend/src/...` = `server/src/...`),
so anything can be moved back if needed. Nothing here is mounted, started or deployed.

ERP code that the live server still uses (for example models read by the AI tools, the admission
controller used by the Razorpay webhook) stayed in `server/`.
