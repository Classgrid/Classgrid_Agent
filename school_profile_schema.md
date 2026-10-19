<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# School Profile Schemas

This document tracks the UI profile schemas for various roles within the `school` organization type.

> **AI WORKFLOW RULES (STRICT SOP - DO NOT FORGET):**
> Every time a new role is provided by the user, the AI MUST do the following:
> 1. **Update THIS MD File** (to track fields and [PRIVATE] tags).
> 2. **Update `server/src/utils/profile-schemas.js`** (Inject the fields into the UI engine, setting `private: true` for [PRIVATE] fields).
> 3. **Update `server/src/models/UserProfile.js`** (Inject any [NEW] fields safely).
> 4. **Update Frontend Global User Detail Page** (Ensure logic exists to hide `private: true` fields from public viewers).
> 5. **Update Frontend Profile Stepper** (Ensure all fields are visible for the owner filling it out).

---

## School Student (Role: `student`)

**Progress:** 14 out of 14 roles defined.
**Current Role:** School Student (Lean)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.place_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.domicile` 
- `identity.mother_tongue` 
- `identity.aadhar_number` [PRIVATE]
- `identity.student_id` [NEW]
- `identity.qualification` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Passport Details
- `passport_details.passport_number` [PRIVATE]
- `passport_details.passport_valid_upto` 
- `passport_details.visa_number` [PRIVATE]

### Section 6: Admission Details
- `admission_details.admission_main_category` 
- `admission_details.seat_type` 
- `admission_details.cap_round` 
- `admission_details.lateral_entry` 

### Section 7: Contact
- `contact.personal_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_district` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_district` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 

### Section 8: Family
- `family.father_occupation` 
- `family.mother_occupation` 
- `family.father_income` [PRIVATE]
- `family.mother_income` [PRIVATE]
- `family.father_mobile` [PRIVATE]
- `family.mother_mobile` [PRIVATE]
- `family.father_email` [PRIVATE]
- `family.mother_email` [PRIVATE]
- `family.father_education` 
- `family.mother_education` 
- `family.local_guardian_name` 
- `family.local_guardian_mobile` [PRIVATE]
- `family.local_guardian_address` [PRIVATE]

### Section 9: Education
- `education.tenth_board` 
- `education.tenth_percentage` 
- `education.twelfth_board` 
- `education.twelfth_percentage` 
- `education.pcm_percentage` 
- `education.diploma_percentage` 
- `education.previous_school` 
- `education.previous_percentage` 
- `education.en_number` 
- `education.cet_score` 
- `education.jee_score` 
- `education.entrance_score` 
- `education.university_prn_number` 

### Section 10: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]

### Section 11: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 12: Activity
- `activity.clubs_joined` 
- `activity.committees` 
- `activity.nss_ncc` 
- `activity.internships` 
- `activity.projects` 

### Section 13: Social
- `social.instagram_url` 
- `social.facebook_url` 
- `social.linkedin_url` 
- `social.github_url` 
- `social.portfolio_url` 

### Section 14: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.disability_type` [PRIVATE]
- `medical.medical_insurance` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 15: Skills Interests
- `skills_interests.skills` 
- `skills_interests.interests` 
- `skills_interests.languages_known` 
- `skills_interests.career_goal` 

### Section 16: Anti Ragging
- `anti_ragging.undertaking_signed` 
- `anti_ragging.undertaking_file_url` [PRIVATE]
- `anti_ragging.compliance_status` 


## School Teacher (Role: `teacher`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.teacher_training_certificate` 
- `identity.tet_qualified` 
- `identity.tet_score` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 
- `family.local_guardian_name` 
- `family.local_guardian_mobile` [PRIVATE]

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_percentage` 
- `education.undergraduate_university` 
- `education.undergraduate_year` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_percentage` 
- `education.postgraduate_university` 
- `education.postgraduate_year` 
- `education.b_ed_degree` 
- `education.b_ed_percentage` 
- `education.b_ed_university` 
- `education.b_ed_year` 
- `education.phd` 
- `education.phd_specialization` 
- `education.phd_university` 
- `education.phd_year` 
- `education.net_qualified` 
- `education.slet_qualified` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience

### Section 11: Awards Participation
- `awards_participation.best_teacher_award` 
- `awards_participation.national_seminar_attended` 
- `awards_participation.workshop_attended` 
- `awards_participation.publications` 
- `awards_participation.patents` 

### Section 12: Social
- `social.linkedin_url` 
- `social.portfolio_url` 
- `social.professional_blog` 
- `social.research_gate` 
- `social.google_scholar` 
- `social.orcid_id` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.disability_type` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.technical_skills` 
- `skills_interests.soft_skills` 
- `skills_interests.pedagogical_skills` 
- `skills_interests.classroom_management_skills` 
- `skills_interests.multi_lingual_skills` 
- `skills_interests.cpd_courses_completed` 
- `skills_interests.languages_known` 
- `skills_interests.career_goal` 


## School Principal (Role: `principal`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.date_of_retirement` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 
- `identity.supervisory_roles` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 
- `contact.primary_contact_for` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 
- `family.local_guardian_name` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 
- `education.b_ed_degree` 
- `education.b_ed_university` 
- `education.phd` 
- `education.phd_specialization` 
- `education.phd_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.total_years_teaching` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.administrative_roles_held` 
- `experience.board_experience` 
- `experience.ncert_expert_panel` 
- `experience.textbook_committee` 

### Section 11: Awards Participation
- `awards_participation.best_principal_award` 
- `awards_participation.national_awards` 
- `awards_participation.state_awards` 
- `awards_participation.publications` 
- `awards_participation.research_articles` 

### Section 12: Social
- `social.linkedin_url` 
- `social.portfolio_url` 
- `social.professional_blog` 
- `social.educational_forum_memberships` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.leadership_skills` 
- `skills_interests.financial_management_skills` 
- `skills_interests.hr_management_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.negotiation_skills` 
- `skills_interests.technology_proficiency` 


## School Vice Principal (Role: `vice_principal`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.date_of_retirement` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 
- `identity.supervisory_roles` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 
- `contact.primary_contact_for` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 
- `family.local_guardian_name` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 
- `education.b_ed_degree` 
- `education.b_ed_university` 
- `education.phd` 
- `education.phd_specialization` 
- `education.phd_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.total_years_teaching` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.administrative_roles_held` 
- `experience.board_experience` 
- `experience.ncert_expert_panel` 
- `experience.textbook_committee` 

### Section 11: Awards Participation
- `awards_participation.best_principal_award` 
- `awards_participation.national_awards` 
- `awards_participation.state_awards` 
- `awards_participation.publications` 
- `awards_participation.research_articles` 

### Section 12: Social
- `social.linkedin_url` 
- `social.portfolio_url` 
- `social.professional_blog` 
- `social.educational_forum_memberships` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.leadership_skills` 
- `skills_interests.financial_management_skills` 
- `skills_interests.hr_management_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.negotiation_skills` 
- `skills_interests.technology_proficiency` 

### Section 15: Vp Administration
- `vp_administration.primary_role` 


## School Academic Coordinator (Role: `academic_coordinator`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 
- `education.b_ed_degree` 
- `education.b_ed_university` 
- `education.phd` 
- `education.phd_specialization` 
- `education.net_qualified` 
- `education.slet_qualified` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.total_years_teaching` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.subjects_taught` 
- `experience.curriculum_development_experience` 
- `experience.ncert_expert_panel` 
- `experience.textbook_committee` 
- `experience.teacher_training_conducted` 

### Section 11: Awards Participation
- `awards_participation.best_teacher_award` 
- `awards_participation.workshop_conducted` 
- `awards_participation.publications` 
- `awards_participation.patents` 

### Section 12: Social
- `social.linkedin_url` 
- `social.portfolio_url` 
- `social.professional_blog` 
- `social.research_gate` 
- `social.google_scholar` 
- `social.educational_forum_memberships` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.pedagogical_skills` 
- `skills_interests.leadership_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.technology_proficiency` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.lms_proficiency` 
- `skills_interests.multi_lingual_skills` 

### Section 15: Academic Coordination
- `academic_coordination.primary_role` 
- `academic_coordination.board_affiliation` 


## School Examination Controller (Role: `examination_controller`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 
- `education.b_ed_degree` 
- `education.b_ed_university` 
- `education.phd` 
- `education.net_qualified` 
- `education.slet_qualified` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.total_years_teaching` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.subjects_taught` 
- `experience.board_experience` 
- `experience.affiliation_experience` 
- `experience.school_inspection_experience` 

### Section 11: Awards Participation
- `awards_participation.best_teacher_award` 
- `awards_participation.publications` 

### Section 12: Social
- `social.linkedin_url` 
- `social.professional_blog` 
- `social.educational_forum_memberships` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.pedagogical_skills` 
- `skills_interests.leadership_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.technology_proficiency` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.negotiation_skills` 

### Section 15: Examinations
- `examinations.exam_committee_role` 


## School Fees Manager (Role: `fees_manager`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]
- `bank.financial_authorization` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 

### Section 11: Awards Participation
- `awards_participation.publications` 

### Section 12: Social
- `social.linkedin_url` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.financial_management_skills` 
- `skills_interests.hr_management_skills` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.technology_proficiency` 
- `skills_interests.negotiation_skills` 
- `skills_interests.communication_skills` 


## School Library Manager (Role: `library_manager`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 
- `education.net_qualified` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 

### Section 11: Awards Participation
- `awards_participation.workshop_attended` 
- `awards_participation.publications` 

### Section 12: Social
- `social.linkedin_url` 
- `social.portfolio_url` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.technical_skills` 
- `skills_interests.lms_proficiency` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.languages_known` 
- `skills_interests.interests` 


## School Transport Manager (Role: `transport_manager`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 
- `experience.work_shift` 

### Section 11: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]
- `medical.last_health_checkup_date` [PRIVATE]

### Section 12: Skills Interests
- `skills_interests.technical_skills` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.negotiation_skills` 

### Section 13: Infrastructure
- `infrastructure.vehicles_count` 


## School Admissions Head (Role: `admissions_head`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 
- `experience.parent_teacher_meetings_conducted` 

### Section 11: Awards Participation
- `awards_participation.publications` 

### Section 12: Social
- `social.linkedin_url` 

### Section 13: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 14: Skills Interests
- `skills_interests.communication_skills` 
- `skills_interests.negotiation_skills` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.technology_proficiency` 
- `skills_interests.multi_lingual_skills` 

### Section 15: Admissions
- `admissions.admission_committee_member` 


## School Library Admin (Role: `library_admin`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 

### Section 11: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 12: Skills Interests
- `skills_interests.technical_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.languages_known` 


## School Attendance Admin (Role: `attendance_admin`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 

### Section 11: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 12: Skills Interests
- `skills_interests.technical_skills` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.communication_skills` 


## School Hr Manager (Role: `hr_manager`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.specialization` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.professional_memberships` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 
- `contact.office_extension` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 
- `education.postgraduate_degree` 
- `education.postgraduate_specialization` 
- `education.postgraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 

### Section 11: Social
- `social.linkedin_url` 

### Section 12: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]

### Section 13: Skills Interests
- `skills_interests.hr_management_skills` 
- `skills_interests.financial_management_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.negotiation_skills` 
- `skills_interests.data_analysis_skills` 
- `skills_interests.technology_proficiency` 

### Section 14: Payroll
- `payroll.salary_revision_authority` [PRIVATE]


## School Hostel Manager (Role: `hostel_manager`)

### Section 1: Identity
- `identity.first_name` 
- `identity.middle_name` 
- `identity.last_name` 
- `identity.gender` 
- `identity.date_of_birth` 
- `identity.blood_group` 
- `identity.nationality` 
- `identity.mother_tongue` 
- `identity.marital_status` 
- `identity.aadhar_number` [PRIVATE]
- `identity.pan_number` [PRIVATE]
- `identity.employee_id` 
- `identity.qualification` 
- `identity.recruitment_type` 
- `identity.date_of_joining` 
- `identity.educational_qualifications` 
- `identity.certifications` 
- `identity.confirmation_status` 
- `identity.department` 
- `identity.designation` 
- `identity.employee_category` 
- `identity.pay_scale` [PRIVATE]
- `identity.reporting_to` 

### Section 2: Religion Details
- `religion_details.religion` 
- `religion_details.caste` 
- `religion_details.sub_caste` 
- `religion_details.creamy_layer` [PRIVATE]

### Section 3: Handicap Details
- `handicap_details.physically_handicapped` 
- `handicap_details.ph_type` 
- `handicap_details.ph_percentage` [PRIVATE]

### Section 4: Minority Details
- `minority_details.belongs_to_minority` 
- `minority_details.minority_type` 

### Section 5: Contact
- `contact.personal_email` 
- `contact.work_email` 
- `contact.alternate_phone` 
- `contact.whatsapp_number` 
- `contact.permanent_address` 
- `contact.permanent_city` 
- `contact.permanent_state` 
- `contact.permanent_country` 
- `contact.permanent_pincode` 
- `contact.current_address` 
- `contact.current_city` 
- `contact.current_state` 
- `contact.current_country` 
- `contact.current_pincode` 
- `contact.emergency_contact_name` 
- `contact.emergency_contact_mobile` [PRIVATE]
- `contact.emergency_contact_relation` 
- `contact.official_phone` 

### Section 6: Family
- `family.spouse_name` 
- `family.spouse_occupation` 
- `family.spouse_contact` [PRIVATE]
- `family.number_of_children` 

### Section 7: Education
- `education.undergraduate_degree` 
- `education.undergraduate_specialization` 
- `education.undergraduate_university` 

### Section 8: Bank
- `bank.account_holder_name` [PRIVATE]
- `bank.bank_name` [PRIVATE]
- `bank.bank_account_number` [PRIVATE]
- `bank.bank_ifsc_code` [PRIVATE]
- `bank.uan_number` [PRIVATE]
- `bank.pf_number` [PRIVATE]
- `bank.nominee_name` [PRIVATE]
- `bank.nominee_relation` [PRIVATE]

### Section 9: Documents
- `documents.document_name` 
- `documents.document_type` 
- `documents.document_number` [PRIVATE]
- `documents.issued_date` 
- `documents.expiry_date` 
- `documents.verified_status` 
- `documents.file_url` [PRIVATE]

### Section 10: Experience
- `experience.experience_years` 
- `experience.experience_details` 
- `experience.years_in_current_school` 
- `experience.previous_schools` 
- `experience.responsibilities` 
- `experience.work_shift` 

### Section 11: Medical
- `medical.medical_conditions` [PRIVATE]
- `medical.allergies` [PRIVATE]
- `medical.blood_group` 
- `medical.emergency_medical_contact` [PRIVATE]
- `medical.last_health_checkup_date` [PRIVATE]

### Section 12: Skills Interests
- `skills_interests.leadership_skills` 
- `skills_interests.communication_skills` 
- `skills_interests.hr_management_skills` 
- `skills_interests.multi_lingual_skills` 

### Section 13: Infrastructure
- `infrastructure.hostel_facility` 

