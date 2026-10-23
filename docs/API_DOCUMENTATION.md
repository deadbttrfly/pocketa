# Pocketa API Documentation

## 1. Introduction

Pocketa API is a RESTful backend API for **Pocketa**, a personal finance management application.

The API provides functionality for managing personal financial data, including:

* User authentication
* Accounts
* Categories
* Transactions
* Budgets
* Financial goals
* Goal contributions
* Recurring transactions
* Dashboard data
* Financial reports

The API is built with:

* **Node.js**
* **Express.js**
* **MySQL**
* **JWT (JSON Web Token)** for authentication

All protected resources are scoped to the authenticated user to prevent unauthorized access to other users' financial data.

---

## 2. Base URL

### Development

```text
http://localhost:8000
```

All API endpoints are prefixed with:

```text
/api
```

Example:

```text
GET http://localhost:8000/api/accounts
```

---

## 3. API Response Format

Pocketa uses a consistent JSON response structure.

### Successful Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message"
}
```

The `data` property is included when the endpoint returns data.

---

## 4. Authentication

Pocketa uses **JWT Bearer Token Authentication** for protected endpoints.

After successfully logging in, the API returns an authentication token.

Example:

```http
POST /api/auth/login
```

Successful response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Irfan",
      "email": "irfan@example.com"
    },
    "token": "JWT_TOKEN"
  }
}
```

The returned token must be included in the `Authorization` header when accessing protected endpoints.

---

## 5. Authorization Header

Protected endpoints require the following HTTP header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Example:

```bash
curl http://localhost:8000/api/accounts \
-H "Authorization: Bearer $TOKEN"
```

The server verifies the JWT before allowing access to protected resources.

The authenticated user's ID is extracted from the token and used to scope database queries.

---

## 6. Protected Resources

The following resources require authentication:

| Resource               | Authentication |
| ---------------------- | -------------- |
| Accounts               | Required       |
| Categories             | Required       |
| Transactions           | Required       |
| Budgets                | Required       |
| Goals                  | Required       |
| Goal Contributions     | Required       |
| Recurring Transactions | Required       |
| Dashboard              | Required       |
| Reports                | Required       |

Authentication endpoints such as registration and login do not require an existing JWT token.

---

## 7. Authentication Errors

### 401 — Token Missing

Request:

```bash
curl http://localhost:8000/api/accounts
```

Response:

```json
{
  "success": false,
  "message": "Authorization token is required"
}
```

---

### 401 — Invalid or Expired Token

Request:

```bash
curl http://localhost:8000/api/accounts \
-H "Authorization: Bearer invalid-token"
```

Response:

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 401 — Invalid Authorization Format

Request:

```bash
curl http://localhost:8000/api/accounts \
-H "Authorization: invalid-token"
```

Response:

```json
{
  "success": false,
  "message": "Invalid authorization format"
}
```

---

## 8. User Data Isolation

Pocketa applies user-level data isolation to protected resources.

An authenticated user can only access resources belonging to their own account.

For example:

```text
User 1
  │
  ├── Account #1
  ├── Account #2
  ├── Transaction #21
  └── Goal #3

User 2
  │
  ├── Account #8
  ├── Transaction #35
  └── Goal #7
```

If User 2 attempts to access User 1's protected resource, the API does not expose the resource.

Example:

```http
PUT /api/accounts/1
```

Response:

```json
{
  "success": false,
  "message": "Account not found"
}
```

This prevents users from discovering or modifying resources belonging to another user.

---

## 9. HTTP Methods

Pocketa follows standard REST conventions.

| Method | Purpose                    |
| ------ | -------------------------- |
| GET    | Retrieve resources         |
| POST   | Create resources           |
| PUT    | Update resources           |
| PATCH  | Partially update resources |
| DELETE | Delete resources           |

Examples:

```text
GET     /api/accounts
POST    /api/accounts
PUT     /api/accounts/:id
DELETE  /api/accounts/:id
```

---

## 10. Content Type

Requests containing a body must use:

```http
Content-Type: application/json
```

Example:

```http
Content-Type: application/json
```

If an unsupported content type is sent to a body-based API endpoint, the server returns:

```json
{
  "success": false,
  "message": "Content-Type must be application/json"
}
```

---

## 11. API Health Check

Pocketa provides a public health check endpoint:

```http
GET /api/health
```

Example:

```bash
curl http://localhost:8000/api/health
```

Response:

```json
{
  "success": true,
  "message": "Pocketa API and database are running 🚀",
  "database": "connected"
}
```

This endpoint can be used to verify that the API server and MySQL database connection are operational.
