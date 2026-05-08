# Mess Management System

A full-stack web application that allows students to select meal plans, make online payments, and access meals based on completed payments. The system also enables mess owners to manage and update available meal options dynamically.

## Features

- Student registration and login
- Meal plan selection
- Secure online payments using Razorpay
- View booking and payment details
- Payment-based meal access system
- Mess owner access to manage meal options
- Transaction and user management

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- MySQL
- Razorpay API


## Database Setup

Create a MySQL database and run the following SQL queries to create the required tables.

```sql
CREATE DATABASE mess;

USE mess;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50)
);

CREATE TABLE menu (
    meal_type VARCHAR(50),
    items TEXT
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100),
    days INT,
    valid_from DATE,
    valid_till DATE,
    payment_id VARCHAR(255),
    order_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## Folder Structure

```txt
project-folder/
│
├── public/
├── views/
├── node_modules/
├── .env
├── package.json
├── package-lock.json
├── server.js
```

## Setup Instructions

After cloning the repository, follow these steps before running the project.

### 1. Install Dependencies

Run the following command to install all required node modules:

```bash
npm install
```

### 2. Create a `.env` File

Create a `.env` file in the root directory and add your own database and Razorpay credentials.

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=mess

RAZORPAY_KEY_ID=your_key_id
RAZORPAY_SECRET=your_secret_key
```

### 3. Configure MySQL Database

Create the MySQL database using the SQL queries provided above and update the credentials in the `.env` file accordingly.

### 4. Run the Server

```bash
node server.js
```

The application will start on the configured port.

## Future Improvements

- QR-based meal verification
- Email notifications for payments and bookings
- Monthly analytics and reports
- Mobile responsive dashboard
