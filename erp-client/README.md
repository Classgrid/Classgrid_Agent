# ERP client (shut down)

The old Classgrid ERP frontend: org admin, departments (admissions, fees, exams, library, attendance,
HR, hostel), student and faculty dashboards, classrooms, website CMS and the ERP login/onboarding pages.

It was moved out of `client/` so the live products (chat.classgrid.in and the super admin dashboard)
only build what they use. The files keep their original paths (`erp-client/src/...` = `client/src/...`)
and their `@/...` imports, so any page can be moved back if it is ever needed. Nothing here is built
or deployed.
