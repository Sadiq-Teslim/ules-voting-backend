# ULES Awards – Voting Platform (Backend)

This repository contains the backend server for the **University of Lagos Engineering Society (ULES) Annual Awards** voting platform.
It ensures **secure, transparent, and efficient** voting using **Node.js**, **Express**, and **MongoDB**, with features for voter verification, nomination handling, and admin controls.

---

## 🚀 Features

* **Matric Number Validation** – Confirms voter eligibility using admission year, faculty, and department codes.
* **One-Person-One-Vote** – Prevents duplicate submissions by logging matric numbers after voting.
* **Nomination Management** – Accepts public nominations and stores them in a "pending" queue for admin approval.
* **Admin Tools** – Password-protected endpoints for viewing live results, controlling election status, and managing nominations.
* **Persistent Storage** – Built on MongoDB Atlas with Mongoose for structured data management.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (with Mongoose ODM)
* **Middleware:** CORS for secure cross-origin communication
* **Environment Management:** dotenv for handling sensitive variables

---

## ⚡ Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended)
* npm or yarn
* [MongoDB Atlas](https://www.mongodb.com/atlas) account

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Sadiq-Teslim/ules-voting-backend.git
   cd ules-voting-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the project root:

   ```env
   # MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster...

   # Password for accessing admin-only endpoints
   ADMIN_PASSWORD=your_super_secret_password
   ```

> **Note:** Never commit your `.env` file.

---

### Run the Development Server

```bash
node server.js
```

Your server will start and listen on the default port (or one specified in your environment file).

---

## 📂 Project Structure

```
ules-voting-backend/
│
├── models/           # Mongoose models (Votes, Nominations, etc.)
├── routes/           # API routes for voters, admins, and nominations
├── utils/            # Utility functions (validation, security, etc.)
├── server.js         # Entry point
└── .env.example      # Sample environment variables
```

---

## 🔐 Security Notes

* All admin routes are **password-protected**.
* Votes are tied to unique matric numbers to enforce **one-person-one-vote**.
* No sensitive keys or passwords are committed to the repository.

---

## 📌 Roadmap

* [ ] Implement JWT authentication for admins.
* [ ] Add vote encryption for enhanced security.
* [ ] Build API documentation using Swagger.

---

The server will start on `http://localhost:4000` and connect to your MongoDB database.

## API Endpoints

All routes are prefixed with `/api`.

| Method | Endpoint             | Description                                                   | Body (Example)                                                   |
| ------ | -------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| POST   | /validate            | Checks if a matric number is valid and has not voted.         | `{ "matricNumber": "240404035" }`                                |
| POST   | /submit              | Submits a user's final votes.                                 | `{ "fullName": "...", "matricNumber": "...", "choices": [...] }` |
| POST   | /nominate            | Submits one or more nominations for admin review.             | `{ "nominations": [...] }`                                       |
| GET    | /election-status     | Gets the current status of the election ('open' or 'closed'). | (None)                                                           |
| POST   | /results             | (Admin) Fetches the live vote counts.                         | `{ "password": "..." }`                                          |
| POST   | /pending-nominations | (Admin) Fetches all nominations with a 'pending' status.      | `{ "password": "..." }`                                          |
| POST   | /toggle-election     | (Admin) Opens or closes the election.                         | `{ "password": "..." }`                                          |
| POST   | /delete-nominations  | (Admin) Deletes all pending nominations.                      | `{ "password": "..." }`                                          |

---

## Deployment

This backend is designed for and deployed on **Render**.

* The **Start Command** should be:

```bash
node server.js
```

* All environment variables (`MONGODB_URI`, `ADMIN_PASSWORD`) must be set in the **Render dashboard environment settings** for the live service.

---

**Contributions & feedback are welcome!** 🎉
**Built by Sadiq Teslim Adetola** 🎉
