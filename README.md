# AI-Powered Expense Tracker

An intelligent personal finance management application built with the MERN stack that helps users track income and expenses, manage budgets, categorize transactions, and receive AI-generated financial insights using Google Gemini.

---

## Features

### Authentication
- User Registration & Login
- JWT Authentication
- Protected Routes
- User Profile Management

### Transaction Management
- Add Income & Expenses
- Edit & Delete Transactions
- Transaction History
- Category-Based Organization
- Date-Based Tracking

### Budget Management
- Create Monthly & Weekly Budgets
- Track Budget Utilization
- Spending Progress Visualization
- Budget Alerts
- AI Budget Analysis

### Categories
- Custom Income Categories
- Custom Expense Categories
- Category Colors & Icons
- Category Management

### AI-Powered Insights
Powered by Google Gemini:

- Monthly Financial Summaries
- Spending Pattern Analysis
- Budget Health Analysis
- Savings Recommendations
- Transaction Analysis
- Personalized Financial Suggestions

### Dashboard & Analytics
- Financial Overview
- Income vs Expense Tracking
- Spending Breakdown
- Budget Performance Monitoring
- AI Insights Dashboard

---

## Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Axios
- React Router
- React Hot Toast
- Lucide React

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Google Gemini API

---

## Project Structure

```bash
AI-Powered-Expense-Tracker/
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── utils/
│   │   └── lib/
│
├── Backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── config/
│
└── README.md
```

---

## Database Models

### User
```js
{
  name,
  email,
  password,
  currency
}
```

### Transaction

```js
{
  userId,
  categoryId,
  amount,
  type,
  description,
  transactionDate
}
```

### Category

```js
{
  userId,
  name,
  type,
  icon,
  color,
  isDefault
}
```

### Budget

```js
{
  userId,
  categoryId,
  amount,
  period,
  startDate
}
```

### AI Insight

```js
{
  userId,
  insightType,
  content,
  createdAt
}
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/TanviLokhande06/AI-Powered-Expense-Tracker.git

cd AI-Powered-Expense-Tracker
```

---

## Backend Setup

Navigate to backend folder:

```bash
cd Backend
```

Install dependencies:

```bash
npm install
```

Create `.env`

```env
PORT=8000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_gemini_api_key
```

Start backend:

```bash
npm run dev
```

---

## Frontend Setup

Navigate to frontend folder:

```bash
cd Frontend
```

Install dependencies:

```bash
npm install
```

Create `.env`

```env
VITE_API_URL=http://localhost:8000/api
```

Start frontend:

```bash
npm run dev
```

---

## API Endpoints

### Auth

| Method | Endpoint             |
| -------- | -------------------- |
| POST | /api/auth/register |
| POST | /api/auth/login |

### Transactions

| Method | Endpoint |
| -------- | -------- |
| GET | /api/transactions |
| POST | /api/transactions |
| PUT | /api/transactions/:id |
| DELETE | /api/transactions/:id |

### Categories

| Method | Endpoint |
| -------- | -------- |
| GET | /api/categories |
| POST | /api/categories |
| PUT | /api/categories/:id |
| DELETE | /api/categories/:id |

### Budgets

| Method | Endpoint |
| -------- | -------- |
| GET | /api/budgets |
| POST | /api/budgets |
| PUT | /api/budgets/:id |
| DELETE | /api/budgets/:id |
| POST | /api/budgets/analyze |

### AI Insights

| Method | Endpoint |
| -------- | -------- |
| GET | /api/insights |
| POST | /api/insights/generate |
| POST | /api/insights/analyze-transactions |

---

## AI Features

The application uses Google Gemini to:

- Analyze spending behavior
- Generate monthly summaries
- Provide budget recommendations
- Suggest saving opportunities
- Detect unusual spending patterns
- Deliver personalized financial advice

---

## Future Enhancements

- Recurring Transactions
- Export Reports (PDF/Excel)
- Multi-Currency Support
- Dark Mode
- Financial Goal Tracking
- AI Chat Assistant
- Expense Forecasting
- Email Budget Alerts

---

## Author

Tanvi Lokhande

---

## License

This project is licensed under the MIT License.
