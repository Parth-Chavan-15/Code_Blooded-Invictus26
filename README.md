# Invictus'26 Code_Blooded - Electrolyte Solutions MRP Engine

An enterprise-grade, ACID-compliant Material Requirements Planning (MRP) engine built for the Invictus 2026 Hackathon. 

This application prioritizes **data integrity and system reliability over visual polish**, modeling real-world factory workflows including strict inventory netting, Quality Control quarantines, and immutable audit trails.


## 💻 Tech Stack
* **Frontend:** React.js, Vite, Tailwind CSS, Recharts, XLSX.
* **Backend:** Node.js, Express.js, Multer, JWT Authentication.
* **Database:** PostgreSQL.

---

## 🚀 Quick Start Guide

Follow these steps to run the factory simulation locally.

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
* **Node.js** (v18.0.0 or higher recommended)
* **PostgreSQL** (v14 or higher)
* **Git**

### 1. Database Setup
1. Ensure PostgreSQL is installed and running on your machine.
2. Create a new database named `invictus_inventory`.
3. Open your SQL client (e.g., pgAdmin) and run the entire script found in `database_setup.sql`. This will generate the schema, triggers, and inject sample factory data.

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and configure your environment.
```bash
cd backend
npm install
```

Rename the .env.example file to .env and update the PostgreSQL password to match your local setup:

<pre>
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=invictus_inventory
DB_PASSWORD=your_password_here
DB_PORT=5432
JWT_SECRET=super_secret_key_replace_me
Start the backend engine:
</pre>

```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and start the Vite development server.

```bash
cd frontend
npm install
npm run dev
```

### 4. Authentication
The database setup script automatically injects a master admin account. Navigate to http://localhost:5173 and log in with:

Admin ID: admin

Password: admin123
