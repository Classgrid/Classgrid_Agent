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

# Classgrid Tenant Website Blueprint
## For: Schools | Junior Colleges | Coaching Institutes
## Excluded: Engineering Colleges (they have their own complex websites)

---

## HEADER / NAVBAR (Sticky)
```
[Logo]  Home | About | Programs | Notices | Merit List | Fees | Gallery | Events | Alumni | Blog | Contact    [Apply Now]  [Login]
```
- Logo: Left aligned
- Navigation: Center
- Apply Now: Highlighted CTA button (primary color)
- Login: Small ghost button (top right)
- Sticky on scroll

---

## TERMINOLOGY (Auto-switches based on org_type in MongoDB)
| Section      | School           | Junior College        | Coaching              |
|-------------|------------------|-----------------------|-----------------------|
| Programs    | Classes (1–12)   | Streams (Sci/Com/Art) | Batches (JEE/NEET)   |
| Duration    | Academic Year    | 2 Years               | 6 / 12 Months        |

---

## ALL 15 PAGES

### PAGE 1: Home `/`
Sections (long-scroll):
- Hero Banner (full-width image + institution name + tagline)
- Primary CTA: "Apply Now" | Secondary CTA: "Explore Programs"
- Highlights strip (Stats: Total Students, Placements/Results, Years, Achievements)
- Quick Programs preview (3 cards)
- Admission CTA banner
- Notices preview (latest 3)
- Faculty/Mentors preview (top 4, pulled from ERP)
- Gallery preview (6 photos)
- Testimonials (3 alumni cards)
- Floating: Social icons (right side) + "Apply Now" FAB (bottom right)

---

### PAGE 2: About `/about`
- Hero banner with page title
- Institution history (Rich Text from CMS)
- Principal's message (photo + name + message)
- Vision / Mission (optional)
- Accreditations / Awards strip
- Faculty Grid (pulled from ERP faculty_profiles marked as "Public")

---

### PAGE 3: Programs `/programs`
- List of all active Classes / Streams / Batches
- Each card: Name | Duration | Short description | "Know More" button
- Expandable detail on click (fees, eligibility, seats)

---

### PAGE 4: Notices `/notices`
- Timeline list of all public announcements
- Each item: Title | Date | Category badge (Exam / Holiday / General)
- "View All" pagination
- Search / Filter by category

---

### PAGE 5: Notice Detail `/notices/[id]`
- Full notice title
- Date + Category
- Full Rich Text body
- Downloadable PDF attachment (if any)
- Back button

---

### PAGE 6: Merit List & Results `/merit-list`
- Published merit lists in card format
- Each card: Program name | Round | Date | [View PDF] [Download] buttons
- Filter by Program (dropdown)
- Toppers showcase (photo + name + score + "Batch of 20XX")

---

### PAGE 7: Fees & Intake `/fees`
- Clean table: Course | Seats/Intake | Fees Per Year
- Rules & Policies section (simple bullet list)
- Eligibility criteria
- Important Dates (optional collapsible)

---

### PAGE 8: Gallery `/gallery`
- Masonry photo grid (campus, labs, events, celebrations)
- Video gallery tab (YouTube embeds only)
- Category filter: Campus | Events | Sports | Academics
- Lightbox on click

---

### PAGE 9: Events `/events`
- Upcoming events (countdown timer on featured event)
- Past events list (card with photo + title + date)
- Category filter: Cultural | Technical | Sports | Academic

---

### PAGE 10: Event Detail `/events/[slug]`
- Full event title + date + time + venue
- Rich Text description
- Mini photo gallery for that specific event
- Registration CTA (optional)

---

### PAGE 11: Alumni `/alumni`
- Featured alumni grid (Photo + Name + Batch Year + Current Company/College)
- Success stories (short testimonial cards)
- "Are you an alumnus? Connect with us" CTA form

---

### PAGE 12: Blog `/blog`
- Article cards: Thumbnail + Title + Short description + Date + "Read More"
- Category filter
- Search bar

---

### PAGE 13: Blog Post `/blog/[slug]`
- Full article with Rich Text body
- Author + Date
- Social share buttons
- Related posts (3 cards)

---

### PAGE 14: Contact `/contact`
- Address + Phone + Email
- Embedded Google Map (full width)
- Quick Inquiry Form (Name, Phone, Query, Submit)
- Social media links

---

### PAGE 15: Apply (Admission Portal) `/apply`
- Clean full-screen admission form
- Fields: Name | Phone | Email | Program Interested | Class/Stream/Batch | DOB | Address
- On Submit: Creates a Lead in ERP backend (admission.controller.js)
- Confirmation screen with next steps

---

## FOOTER (4-Column Layout)
```
Col 1: Institution Info       Col 2: Academics          Col 3: Important Links      Col 4: Quick Access
- Name                        - Programs list           - Notices                   - Login
- Address                     - Faculty                 - Admission Portal          - Apply Now
- Phone                       - Gallery                 - Merit List                - Support
- Email                       - Events                  - Documents
                                                        - Contact
```
- Bottom: Embedded Google Maps (full width)
- Bottom Strip: © 2026 [Institution Name] | Powered by Classgrid

---

## FLOATING ELEMENTS
- Right side: Social Icons (Facebook, Instagram, LinkedIn, YouTube)
- Bottom Right: Floating "Apply Now" button

---

## DESIGN SYSTEM
- One primary color (customizable per org via theme.primary_color in MongoDB)
- Clean, minimal UI with 60–100px section spacing
- Modern sans-serif typography (Inter / Outfit from Google Fonts)
- Mobile responsive (all 15 pages)
- Card-based components throughout

---

## DATA SOURCES
| Section          | Source                          |
|------------------|---------------------------------|
| All content      | `org_website_content` MongoDB   |
| Faculty Grid     | `faculty_profiles` ERP table    |
| Events           | `events` ERP module (public ones)|
| Blog posts       | `org_website_content.blog`      |
| Apply form data  | → `admission.controller.js`     |
| Gallery images   | Supabase Storage URLs           |
| Videos           | YouTube embed URLs only ❌ No S3/Supabase video|
