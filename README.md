# Pocketa API

A RESTful backend service for Pocketa, a personal finance management application built with Node.js, Express, and MySQL.

Pocketa API provides authenticated financial operations, transaction management, account and budget services, reporting endpoints, notifications, and automated recurring transaction processing.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [API Modules](#api-modules)
- [Recurring Transaction Scheduler](#recurring-transaction-scheduler)
- [Validation and Security](#validation-and-security)
- [Error Handling](#error-handling)
- [Development Workflow](#development-workflow)
- [Testing and Verification](#testing-and-verification)
- [Production Considerations](#production-considerations)
- [Related Repository](#related-repository)
- [Project Status](#project-status)

## Overview

Pocketa API is the backend service for the Pocketa personal finance management system.

It exposes HTTP endpoints consumed by the Pocketa Web frontend and manages the business rules behind financial operations. The service uses MySQL for persistent storage and separates request handling, business logic, and database access into maintainable modules.

The backend is designed to support user-specific financial data, validated financial operations, consistent account balances, and scheduled recurring transactions.

## Features

### 1. Authentication and Session Management

- Authentication endpoints and middleware for protected resources.
- Token-based authentication using the application's configured authentication mechanism.
- User-specific access to financial resources.
- Authorization and ownership checks for protected operations.
- Validation of resource identifiers.
- Authentication error handling for missing or invalid credentials.

Protected routes must enforce authorization on the server rather than relying on frontend restrictions.

### 2. Transaction Management

Provides operations for managing income and expense records.

- Create transactions.
- Retrieve transaction records.
- Update transaction information.
- Delete transactions when permitted.
- Associate transactions with users, accounts, and categories.
- Store transaction amounts, descriptions, and dates.
- Link generated transactions to recurring transaction schedules.
- Maintain account balance consistency through financial operations.

Transactions use the `income` and `expense` types.

### 3. Account Management

Manages the financial accounts associated with a user.

- Create accounts.
- Retrieve account details and account lists.
- Update account information.
- Delete accounts when permitted by relationship constraints.
- Track account balances.
- Support cash, bank, e-wallet, and other account types.
- Validate account identifiers and user ownership.

Account balances are stored using MySQL's fixed-precision decimal type.

### 4. Category Management

Provides category management for financial transactions.

- Create categories.
- Retrieve categories.
- Update category information.
- Delete categories when permitted.
- Associate categories with financial records.
- Apply category-related validation rules.

Category references must satisfy the database relationship constraints and applicable business rules.

### 5. Budget Management

Provides budget management functionality through the API.

- Create budgets.
- Retrieve budget lists and individual records.
- Update budget details.
- Delete budgets.
- Associate budgets with categories.
- Validate positive budget amounts.
- Validate budget date ranges.
- Restrict budgets to expense categories according to the implemented business rules.
- Enforce user ownership of budget records.

Overlapping budget periods are permitted by the implemented budget logic.

Creating or updating a budget does not itself create a financial transaction or change an account balance.

### 6. Financial Goals and Contributions

Supports the financial goal and contribution modules.

- Manage financial goals.
- Retrieve goal-related information.
- Manage goal contributions through the available endpoints.
- Associate goal records with their owning users.
- Validate goal and contribution operations according to the implemented business rules.

Refer to the corresponding route, controller, and service files for the exact endpoint contracts.

### 7. Recurring Transaction Management

Manages schedules for repeated financial transactions.

- Create recurring schedules.
- Retrieve recurring transaction lists and individual schedules.
- Update recurring schedule details.
- Activate and deactivate recurring schedules.
- Delete recurring schedules.
- Support daily and other configured recurrence frequencies.
- Validate schedule dates and financial resource relationships.
- Preserve `next_occurrence` when unrelated fields change.
- Recalculate the next occurrence when schedule-defining fields change.
- Avoid generating transactions retroactively merely because a schedule is edited.

Recurring schedules can generate income or expense transactions according to their configuration.

### 8. Automated Recurring Transaction Scheduler

The backend includes a scheduled processor that checks for due recurring transactions automatically.

- Run periodic due-date checks.
- Process active schedules that are due.
- Create financial transaction records.
- Update the affected account balance.
- Advance the next scheduled occurrence.
- Respect applicable end dates and account status rules.
- Record recurring success and failure notifications where applicable.
- Prevent duplicate recurring transactions for the same schedule and date.

The scheduler is configured to run every five minutes using the `Asia/Jakarta` timezone.

### 9. Reports and Analytics

Provides backend data for financial reporting and analytics.

- Retrieve supported financial summaries.
- Supply transaction information for reporting.
- Support the reporting and analytics views exposed by the application.
- Apply user-specific data access rules.
- Provide the data required by the frontend's available reporting features.

The exact calculations, filters, and response structures are defined by the reporting implementation.

### 10. Dashboard Data

Provides backend data used by the frontend dashboard.

- Retrieve supported financial summaries.
- Supply transaction-related information.
- Provide financial data for the dashboard's overview components.
- Restrict returned information according to the authenticated user.

### 11. Notification Management

Stores and supports financial event notifications.

The database supports the following notification types:

- `budget_alert`
- `recurring_due`
- `recurring_success`
- `recurring_failure`

Notifications include a title, message, optional link, read status, and deduplication key.

A unique database constraint on `(user_id, dedupe_key)` prevents duplicate notification records with the same key for an individual user.

## Technology Stack

- **Node.js** — JavaScript runtime.
- **Express** — HTTP server and routing framework.
- **MySQL** — Relational database.
- **JWT** — Token-based authentication where configured by the application.
- **dotenv** — Environment variable configuration.
- **Nodemon** — Development server monitoring and automatic restart.
- **Parameterized SQL queries** — Database query safety.
- **MySQL transactions** — Consistency for operations that modify related records.

Refer to `package.json` for the exact dependency versions and available scripts.

## Architecture

Pocketa API follows a layered backend architecture.

```text
+-----------------------------+
|        Pocketa Web          |
|       Next.js Frontend      |
+--------------+--------------+
               |
               | HTTP / JSON
               v
+-----------------------------+
|       Express Server        |
|                             |
| Routes                      |
| Middleware                  |
| Controllers                 |
| Services                    |
+--------------+--------------+
               |
               v
+-----------------------------+
|         MySQL Pool          |
+--------------+--------------+
               |
               v
+-----------------------------+
|       MySQL Database        |
|                             |
| Users                       |
| Accounts                    |
| Categories                  |
| Transactions                |
| Budgets                     |
| Financial Goals             |
| Recurring Transactions      |
| Notifications               |
+-----------------------------+

+-----------------------------+
|   Recurring Transaction     |
|         Scheduler           |
+--------------+--------------+
               |
               v
       Recurring Services
```

### Routes

Define the HTTP endpoints and associate them with their controllers.

### Controllers

Handle incoming requests, validate request parameters where appropriate, invoke services, and return HTTP responses.

### Services

Contain business logic, database operations, and financial processing rules.

### Database Layer

Provides database connections and persistent storage through MySQL.

### Scheduler

Runs periodic recurring transaction processing independently of direct user interaction.

## Getting Started

### Prerequisites

Install and configure:

- Node.js.
- npm.
- MySQL Server.
- Git.
- The required Pocketa database schema.
- The environment variables expected by the application.

### 1. Clone the Repository

```bash
git clone <YOUR-POCKETA-API-REPOSITORY-URL>
cd pocketa-api
```

Replace the placeholder with the actual GitHub repository URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env` file containing the configuration required by the backend.

Configuration typically includes:

- Server port.
- Database connection settings.
- Authentication signing secrets or other authentication credentials.
- Token expiration configuration, if applicable.
- Other environment-specific service settings.

Use the exact variable names referenced by the application's source code.

Never commit `.env` files containing credentials or private secrets.

### 4. Prepare the Database

Create the database and apply the schema required by the application.

Core database tables include:

- `users`
- `accounts`
- `categories`
- `transactions`
- `recurring_transactions`
- `notifications`

Other modules, including budgets and financial goals, require their corresponding tables.

Use the schema or migration files maintained by the project. The API should not be assumed to create the entire database automatically.

### 5. Start the Development Server

```bash
npm run dev
```

The development server starts at the configured port. The default local address is:

[http://localhost:8000](http://localhost:8000)

Example startup output:

```text
Pocketa API running on http://localhost:8000
[Recurring Scheduler] Aktif setiap 5 menit; timezone=Asia/Jakarta.
```

The exact output depends on the current application configuration.

## Environment Configuration

Environment variables are loaded through the backend configuration.

Before starting the service, verify the variable names used for:

| Configuration | Purpose |
|---|---|
| Server port | Defines the HTTP listening port. |
| Database host | Identifies the MySQL server. |
| Database port | Defines the MySQL connection port. |
| Database name | Selects the application database. |
| Database user | Defines the database connection account. |
| Database password | Supplies the database credential. |
| Authentication secret | Supports the configured authentication mechanism. |
| Token configuration | Controls token behavior where applicable. |

These are configuration categories, not guaranteed literal environment variable names.

Check the existing `.env.example`, configuration files, and server initialization code for the authoritative names and required values.

## Database Schema

Pocketa uses a relational database with foreign keys and constraints to protect relationships between financial records.

### Core Tables

| Table | Purpose |
|---|---|
| `users` | User records and ownership relationships. |
| `accounts` | Financial accounts and current balances. |
| `categories` | Transaction categories. |
| `transactions` | Income and expense records. |
| `recurring_transactions` | Recurring schedule definitions and processing dates. |
| `notifications` | Financial event notifications. |

Budget and goal-related tables support their respective modules.

### Transactions

The `transactions` table contains fields including:

- `id`
- `user_id`
- `account_id`
- `category_id`
- `recurring_transaction_id`
- `type`
- `amount`
- `description`
- `transaction_date`
- `created_at`
- `updated_at`

The transaction type is represented by `income` or `expense`.

Amounts use `DECIMAL(15,2)` to preserve monetary precision.

### Accounts

The `accounts` table stores the current account balance in a `DECIMAL(15,2)` field.

Account records also contain their owner, name, account type, and active status.

Financial operations must keep account balances consistent with the corresponding transaction records and applicable business rules.

### Recurring Transactions

The `recurring_transactions` table stores recurring schedule information, including:

- User and account identifiers.
- Category identifier.
- Transaction type and amount.
- Description.
- Recurrence frequency.
- Start and optional end dates.
- Next occurrence date.
- Active status.

The `next_occurrence` field determines the next scheduled processing date.

### Duplicate Protection

The `transactions` table defines the following unique key:

```sql
UNIQUE KEY uq_recurring_transaction_date
    (recurring_transaction_id, transaction_date)
```

This prevents duplicate transaction records for the same recurring schedule and date when the recurring ID is non-null.

The constraint supplements the scheduler's application-level processing logic.

### Notifications

The `notifications` table stores notification types, messages, links, read status, and deduplication keys.

The unique constraint on `(user_id, dedupe_key)` protects against duplicate notifications with the same key for a user.

## API Modules

Pocketa API organizes its functionality into resource-specific modules.

| Module | Responsibilities |
|---|---|
| Authentication | Authentication and protected access. |
| Accounts | Account records and balances. |
| Categories | Financial category management. |
| Transactions | Income and expense operations. |
| Budgets | Budget creation, validation, and management. |
| Financial Goals | Goal and contribution operations. |
| Recurring Transactions | Schedule management and automated processing. |
| Dashboard | Financial overview data. |
| Reports | Reporting and analytics data. |
| Notifications | Financial event notifications. |

### Recurring Transaction Routes

The recurring transaction module uses the following route patterns:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/recurring-transactions` | Retrieve recurring schedules. |
| `POST` | `/api/recurring-transactions` | Create a recurring schedule. |
| `GET` | `/api/recurring-transactions/:id` | Retrieve a schedule by ID. |
| `PUT` | `/api/recurring-transactions/:id` | Update a schedule. |
| `DELETE` | `/api/recurring-transactions/:id` | Delete a schedule. |
| `PATCH` | `/api/recurring-transactions/:id/status` | Activate or deactivate a schedule. |
| `POST` | `/api/recurring-transactions/process` | Process due recurring schedules. |

These paths assume the recurring router is mounted at `/api/recurring-transactions`. Confirm the route mounting and middleware in the current source code before relying on the table as an API contract.

The process endpoint should be registered before the parameterized `/:id` route to avoid route matching conflicts.

For other modules, refer to their route files for the complete HTTP methods, paths, authentication requirements, request bodies, and response structures.

## Recurring Transaction Scheduler

The recurring transaction scheduler automates the creation of scheduled financial transactions.

### Processing Workflow

The processing workflow is designed to:

1. Identify active recurring schedules whose next occurrence is due.
2. Validate the associated schedule and financial resources.
3. Skip schedules that are not eligible for processing.
4. Create the corresponding transaction.
5. Update the affected account balance.
6. Advance `next_occurrence` according to the configured frequency.
7. Respect applicable schedule end dates.
8. Record success or failure notifications as appropriate.
9. Commit successful database operations or roll back failed transactional operations.

The precise handling of individual failures depends on the service implementation.

### Schedule Configuration

The scheduler is configured to run every five minutes using the `Asia/Jakarta` timezone.

```text
Timezone: Asia/Jakarta
Interval: Every 5 minutes
```

The scheduler checks due schedules using the application's date-handling logic.

### Example Scheduler Output

```text
[Recurring Scheduler] Aktif setiap 5 menit; timezone=Asia/Jakarta.
[Recurring Scheduler] Memproses 1 user; tanggal 2026-10-23.
[Recurring Scheduler] User 1: processed=1, created=1
```

The log indicates that one user was processed and one transaction was created during that execution.

A subsequent execution may report that no schedules are due if all eligible schedules have already been processed.

### Idempotency and Consistency

The recurring processor is supported by a database-level unique constraint on recurring transaction ID and transaction date.

This prevents a second transaction with the same recurring ID and date from being inserted.

The application must also handle database constraint errors correctly and maintain consistency between:

- Transaction records.
- Account balances.
- Recurring schedule dates.
- Notification records.

Testing should include repeated scheduler executions, invalid schedules, inactive accounts, database failures, and process restarts.

## Validation and Security

Security and input validation are essential because the API handles user-specific financial information.

### Request Validation

Request validation should enforce applicable rules such as:

- Required string fields.
- Valid numeric identifiers.
- Positive monetary amounts where required.
- Valid date values and date ranges.
- Supported transaction types.
- Valid recurrence configuration.
- Valid account and category references.
- Maximum field lengths.
- Valid ownership relationships.

The project includes reusable string validation logic and identifier validation improvements.

### SQL Injection Prevention

Database queries use parameterized SQL for data values.

Resource identifiers should be validated before they are used in database operations.

For example, an identifier containing SQL-like text such as `1 OR 1=1` should be rejected instead of being treated as a valid numeric ID.

### Authentication and Authorization

Protected operations must verify the user's authentication credentials and enforce ownership checks.

A valid identifier alone does not grant access to another user's resource.

### Database Integrity

Foreign keys and unique constraints help protect relationships and prevent duplicate records.

Database transactions should be used when multiple related writes must succeed or fail together.

## Error Handling

The API uses HTTP status codes to communicate request outcomes.

| Status | Meaning |
|---|---|
| `200 OK` | Request completed successfully. |
| `201 Created` | Resource created successfully, where applicable. |
| `400 Bad Request` | Invalid input or request parameters. |
| `401 Unauthorized` | Authentication is missing or invalid. |
| `403 Forbidden` | Access is not permitted. |
| `404 Not Found` | Requested resource was not found. |
| `500 Internal Server Error` | Unexpected server-side failure. |

The exact status codes and response formats depend on the individual route implementation.

Error handling should avoid leaking credentials, internal database details, or stack traces to clients.

## Development Workflow

### Start the Server

```bash
npm run dev
```

### Check JavaScript Syntax

```bash
node --check server.js
```

For individual files, replace `server.js` with the relevant source file path.

### Review Changes

Before committing changes:

1. Review modified routes, controllers, and services.
2. Verify database queries and ownership checks.
3. Validate success and failure cases.
4. Check transaction rollback behavior.
5. Confirm that existing endpoints remain compatible.
6. Review logs for unexpected scheduler behavior.

Use the scripts defined in `package.json` for the project's configured test and lint commands.

## Testing and Verification

The development process includes manual API verification, database checks, and scheduler testing.

Previously verified areas include:

- Account retrieval through an authenticated endpoint.
- Rejection of malformed account identifiers.
- Budget creation and validation.
- Recurring schedule creation and status changes.
- Recurring transaction processing and next-occurrence advancement.
- Database-level duplicate protection.
- Account balance comparison against recorded transactions.
- Recurring success notification records.

These checks represent observed development results, not a guarantee that every endpoint or failure scenario has comprehensive automated test coverage.

### Recurring Transaction Verification

For recurring transaction testing, verify that:

- A due schedule is processed automatically.
- Exactly one transaction is recorded per recurring schedule and date.
- The affected account balance remains consistent with financial records.
- `next_occurrence` advances according to the recurrence configuration.
- The appropriate notification is stored.
- Repeated scheduler runs do not create duplicate records.

Avoid manually triggering a scheduled operation during a test intended to verify automatic processing.

## Production Considerations

Before deploying Pocketa API to production:

- Configure secure production environment variables.
- Use a properly secured MySQL instance.
- Enable HTTPS through the deployment environment.
- Use an appropriate process manager.
- Configure database backups and recovery procedures.
- Add structured logging and error monitoring.
- Review authentication token expiration and revocation behavior.
- Test database transaction rollback and scheduler failure handling.
- Ensure multiple API instances do not unintentionally execute overlapping scheduler jobs without coordination.
- Review all endpoints for authentication, authorization, and input validation.
- Verify that sensitive configuration is never committed to version control.

## Related Repository

**Pocketa Web**

The frontend application provides the user interface for dashboards, financial management, recurring transactions, reports, analytics, and settings.

Replace the placeholder with the actual Pocketa Web GitHub URL when publishing the project.

## Project Status

Pocketa API is under active development.

The backend includes core financial management modules, authentication and authorization logic, database-backed financial operations, notifications, reporting functionality, and automated recurring transaction processing.

Recurring transaction processing has been verified against development database records for the tested schedule. Additional automated tests and production-readiness checks may still be required.

## License

Add the applicable license information here if the repository is distributed under an open-source license.

---

**Pocketa — Personal finance management, organized.**