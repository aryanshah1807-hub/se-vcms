# VCMS Step-by-Step End-to-End Demo Script
## Traceable to SRS Functional & Non-Functional Requirements

### Prerequisites
- Backend API running on `http://localhost:4000`
- Frontend application running on `http://localhost:5173`
- Default password for all demo accounts: `Password@123`

---

### Step 1: Sign In & Role-Based Dashboard (UI-1, SE-2, SE-3, STAFF-2)
1. Navigate to **`http://localhost:5173`**.
2. Notice the persistent navigation header (`Clients and pets`, `Appointments`, `Activity log`, `Notifications`) and the "Signed in as" role selector.
3. Observe default login as **`Receptionist`** (`ravi@vcms.test`). The active dashboard displays the full client & patient directory and daily calendar.

---

### Step 2: Register New Client & Pet (REG-1, REG-2)
1. Go to the **`Clients and pets`** tab.
2. Under "Register a client and pet", enter:
   - Owner name: `Ananya Sharma`
   - Phone: `9876543210`
   - Email: `ananya@example.com`
   - Address: `Colaba, Mumbai`
   - Pet Name: `Milo`
   - Species: `Dog`
   - Breed: `Golden Retriever`
   - Sex: `Male`
   - Date of birth: `2022-05-10`
3. Click **"Save client and pet"**.
4. Confirm `Ananya Sharma` and `Milo (Dog)` immediately appear in the Clients directory table.

---

### Step 3: Duplicate Warning Dialog & Override (REG-3)
1. In the same registration form, try to register another client using an **existing phone number**:
   - Owner name: `A. Sharma`
   - Phone: `9876543210` (Same phone as just registered)
   - Email: `different@example.com`
   - Pet name: `Bella`, Species: `Cat`
2. Click **"Save client and pet"**.
3. **Verify**: A prominent warning banner appears:
   > *"A client with this phone or email already exists: Ananya Sharma. Register anyway?"*
4. Click **"Register anyway"** (override with `confirmDuplicate=true`).
5. Verify the client is successfully registered with its own separate ID.

---

### Step 4: Book Appointment as Receptionist (APT-1, APT-3, BR-3)
1. Switch to the **`Appointments`** tab.
2. In the "Book an appointment" section:
   - Select Pet: `Milo (Ananya Sharma)`
   - Select Veterinarian: `Dr. Rao (9:00–17:00)`
   - Service: `Check-up`
   - Date: Select an upcoming weekday
   - Available time: Notice the dropdown dynamically shows only valid 30-minute intervals between 09:00 and 16:30.
   - Choose `10:00`.
3. Click **"Book appointment"**.
4. Verify the appointment appears in the Calendar table with status **`Scheduled`** (colored badge UI-4).

---

### Step 5: Double-Booking Prevention (APT-4)
1. Try booking another appointment for a different pet with **`Dr. Rao`** on the **same date** at **`10:00`**.
2. Notice `10:00` is automatically removed from the available time slots dropdown (APT-3).
3. If forced via API, the MySQL trigger `trg_appt_hours_ins` immediately rejects it with:
   > *"That slot is already booked for this veterinarian."*

---

### Step 6: Pet Owner Portal - Request Appointment (APT-2, SE-6)
1. In the header dropdown "Signed in as", switch to **`Pet Owner`** (logged in as `Meera Joshi`).
2. Notice the UI isolates access:
   - "Clients and pets" and "Activity log" tabs disappear (STAFF-2, SE-4).
   - The calendar shows **only Meera's pets** (`Bruno` and `Mittens`) (SE-6).
3. Under "Request an appointment":
   - Select Pet: `Bruno`
   - Select Vet: `Dr. Rao`
   - Service: `Vaccination`
   - Date: Upcoming weekday, Time: `14:00`
4. Click **"Send request"**.
5. Observe the new entry appears with status badge **`Requested`** (APT-2).

---

### Step 7: Receptionist Confirms Requested Appointment (APT-2, SRS B.3)
1. Switch "Signed in as" back to **`Receptionist`**.
2. In the Calendar table, locate the appointment with status **`Requested`**.
3. Notice the **`Confirm`** action button is displayed.
4. Click **`Confirm`**. The status immediately transitions to **`Scheduled`**.

---

### Step 8: Reschedule an Appointment (APT-5)
1. Locate any appointment in status **`Scheduled`**.
2. Click **`Reschedule`**.
3. Enter a new valid date and available time.
4. Verify the appointment updates to the new time and a notification is logged.

---

### Step 9: Cancellation with Mandatory Reason (APT-6)
1. Locate an appointment in status **`Scheduled`**.
2. Click the red **`Cancel`** button.
3. A prompt asks for the cancellation reason. Enter: `Owner traveling out of town`.
4. The appointment transitions to **`Cancelled`** and displays the reason underneath.

---

### Step 10: Patient Check-In & State Transition Protection (APT-7, SRS B.3)
1. Find a **`Scheduled`** appointment.
2. Click **`Check in`**.
3. Status changes to **`Checked-In`**.
4. Observe:
   - The `Cancel` button is now disabled/removed (SRS B.3: cancellation prohibited once checked in).
   - Only clinical staff (`Veterinarian`) can advance the appointment to `In-Progress` and `Completed`.

---

### Step 11: Merge Duplicate Clients (REG-4)
1. Switch to **`Clients and pets`** tab.
2. Scroll to the "Merge duplicate clients" section (available to Receptionist and Administrator).
3. Select:
   - Duplicate to remove: `Meera J. (#6)` (deliberate seed duplicate)
   - Client to keep: `Meera Joshi (#1)`
4. Click **`Merge clients`**.
5. Verify in the table: `Meera J.` is archived, and `Bruno Jr.` is now assigned to `Meera Joshi`.

---

### Step 12: View Activity Audit Trail (REG-7)
1. Click the **`Activity log`** tab.
2. Observe chronological entries documenting:
   - Who performed each action (`Ravi Reception`, `Anita Admin`, etc.)
   - Exactly what changed (`INSERT clients #11`, `UPDATE appointments #... (Scheduled)`, etc.)
   - Timestamps and entity identifiers.

---

### Step 13: View Notifications Log (APT-9, CI-1, CI-2)
1. Click the **`Notifications`** tab.
2. Observe all confirmation messages, status change notices, and scheduled 24-hour reminder messages logged with channel and `Delivered (stub)` status.
