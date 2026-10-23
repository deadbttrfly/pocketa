# Pocketa Web

A personal finance management application built with Next.js, React, and TypeScript.

Pocketa helps users organize their finances, track income and expenses, manage financial accounts, monitor budgets, configure recurring transactions, and review their financial activity through a centralized dashboard.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Application Pages](#application-pages)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Backend Integration](#backend-integration)
- [Security and Data Handling](#security-and-data-handling)
- [Development Workflow](#development-workflow)
- [Quality Assurance](#quality-assurance)
- [Related Repository](#related-repository)
- [Project Status](#project-status)

## Overview

Pocketa Web is the frontend application for the Pocketa personal finance management system.

The application provides an interactive interface for managing financial information and communicating with the Pocketa API. Its features are organized into dedicated pages for everyday financial activities, account management, budgeting, recurring transactions, and financial reporting.

The project emphasizes maintainable application architecture, reusable UI components, validated user input, consistent navigation, and a responsive user experience.

## Key Features

### 1. Dashboard

The dashboard serves as the central overview of a user's financial activity.

- View financial summaries and transaction information.
- Access key financial management features.
- Navigate between the application's main sections.
- Review available financial information retrieved from the API.

### 2. Authentication and Session Management

The frontend integrates with the backend authentication system to provide access to protected application features.

- Authentication-aware application navigation.
- Access to protected pages and user-specific data.
- Session and authentication-state handling.
- API request handling for authenticated operations.
- Handling of failed API requests and expired or invalid authentication states where implemented.

Authentication and authorization decisions remain the responsibility of the backend.

### 3. Transaction Management

Manage income and expense records from a dedicated transaction interface.

- View transaction records.
- Create income and expense transactions.
- Edit existing transaction information.
- Delete transactions.
- Associate transactions with financial accounts and categories.
- Record transaction amounts, descriptions, and dates.
- Display transaction information using the data provided by the API.

### 4. Account Management

Manage the financial accounts used to organize personal finances.

- View account information and balances.
- Create financial accounts.
- Update account details.
- Delete accounts when permitted by backend rules.
- Organize accounts by supported account types.
- Display account balances and account status.

Supported account types include cash, bank, e-wallet, and other.

### 5. Category Management

Organize transactions using financial categories.

- View available categories.
- Create categories.
- Edit category information.
- Delete categories when permitted by backend rules.
- Associate categories with transactions.
- Use category information when organizing financial activity.

Category operations follow the validation and relationship constraints enforced by the API.

### 6. Budget Management

Create budgets to organize and monitor planned spending.

- View configured budgets.
- Create budgets associated with expense categories.
- Edit budget details.
- Delete budgets.
- Configure budget amounts and date ranges.
- Review budget information provided by the backend.

Budgets are planning records. Creating a budget does not itself create a transaction or modify an account balance.

### 7. Recurring Transactions

Manage financial transactions that repeat according to a configured schedule.

- View recurring transaction schedules.
- Create recurring transaction configurations.
- Update schedule details.
- Pause and resume recurring transactions.
- Delete recurring schedules.
- Configure transaction types, amounts, accounts, categories, and recurrence settings.
- Review scheduling information, including the next occurrence.
- Access recurring processing and status information exposed by the API.

The backend scheduler is responsible for automatically processing eligible due transactions. The frontend does not replace the backend scheduling mechanism.

### 8. Financial Goals

Organize financial goals and track progress through the available goal-management features.

- View financial goals.
- Create and update goals.
- Delete goals when permitted.
- Manage goal contributions where supported by the application.
- Review goal-related information returned by the API.

Goal-related business rules and data persistence are handled by the backend.

### 9. Reports and Analytics

Review financial activity through dedicated reporting and analytics functionality.

- Access financial summaries and reports.
- Review income and expense information.
- Analyze financial activity using the available report views.
- Use supported reporting filters and date ranges where implemented.
- Review data returned by the reporting and analytics API.

The displayed information depends on the data available to the authenticated user and the reporting capabilities implemented by the backend.

### 10. Notifications

Access notification information generated by supported backend features.

The backend notification system supports events including:

- Budget alerts.
- Recurring transaction due reminders.
- Recurring transaction success notifications.
- Recurring transaction failure notifications.

Notifications are stored by the backend and can be presented through the frontend's available notification interface.

### 11. Settings and Preferences

Manage application settings through the dedicated settings interface.

- Access account-related settings.
- Manage supported application preferences.
- Use available theme preferences.
- Navigate between settings sections and other application pages.

Available settings depend on the functionality implemented by the current application version.

### 12. Navigation and User Interface

The application uses shared interface components to provide a consistent experience.

- Shared application header.
- Sidebar navigation.
- Dedicated application pages.
- Responsive layout behavior.
- Reusable interface components.
- Light and dark theme support where configured.
- Loading, empty, and error states where implemented.

## Application Pages

The application is organized around the following functional areas:

| Page or Module | Purpose |
|---|---|
| Dashboard | Financial overview and application entry point. |
| Transactions | Income and expense management. |
| Accounts | Financial account and balance management. |
| Categories | Transaction category management. |
| Budgets | Spending plan management. |
| Recurring Transactions | Repeated transaction schedules. |
| Financial Goals | Goal and contribution management. |
| Reports & Analytics | Financial summaries and analysis. |
| Notifications | Financial event notifications. |
| Settings | Account and application preferences. |

The exact route structure is defined by the current Next.js App Router implementation.

## Technology Stack

- **Next.js** — React framework and application routing.
- **React** — Component-based user interface.
- **TypeScript** — Type-safe application development.
- **ESLint** — Static analysis and code quality checks.
- **npm** — Dependency management and project scripts.
- **CSS and project styling dependencies** — Application presentation and responsive layouts.

See `package.json` for the exact versions and additional libraries used by the current project.

## Application Architecture

Pocketa uses a separate frontend and backend architecture.

```text
+-----------------------------+
|            User             |
+--------------+--------------+
               |
               v
+-----------------------------+
|         Pocketa Web         |
|                             |
| Next.js                     |
| React                       |
| TypeScript                  |
|                             |
| Pages, UI, Navigation       |
+--------------+--------------+
               |
               | HTTP / JSON
               v
+-----------------------------+
|          Pocketa API        |
|                             |
| Express Routes              |
| Controllers                 |
| Services                    |
| Authentication              |
+--------------+--------------+
               |
               v
+-----------------------------+
|         MySQL Database      |
+-----------------------------+
```

The frontend is responsible for presentation, user interaction, and client-side behavior. The backend handles business logic, authorization, financial calculations, and persistent data operations.

## Getting Started

### Prerequisites

Before running the frontend, install:

- Node.js.
- npm.
- Git.
- A running Pocketa API instance.

A compatible MySQL database must also be configured for the backend.

### 1. Clone the Repository

```bash
git clone <YOUR-POCKETA-WEB-REPOSITORY-URL>
cd pocketa-web
```

Replace the placeholder with the actual GitHub repository URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env.local` file if required by the project.

Configure the frontend API base URL using the variable name expected by the current source code.

For example, a frontend may use a public API URL variable, but the exact variable name must match the application's implementation.

Do not copy this example as a literal variable name unless it matches the current configuration.

### 4. Start the Backend

Ensure the Pocketa API is configured and running before testing functionality that requires server communication.

The default backend development address is:

```text
http://localhost:8000
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The development server supports hot reloading when application files change.

## Environment Configuration

Environment variable names and required values are determined by the current source code.

Before starting the application, inspect the existing configuration and identify:

- The backend API base URL.
- Any authentication-related public configuration.
- Other environment-specific frontend settings.

Keep local environment files out of version control when they contain private values.

Never expose database credentials, signing secrets, or private API tokens through client-side environment variables.

## Available Scripts

Run the following commands from the project directory:

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Builds the application for production.

```bash
npm run start
```

Starts the production server after a successful build.

```bash
npm run lint
```

Runs the configured ESLint checks.

These commands correspond to the project's current Next.js scripts. Refer to `package.json` for the authoritative script definitions.

## Project Structure

The project uses the Next.js App Router and a shared component structure.

```text
## Project Structure

```text
pocketa-web/
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js pages, layouts, and routing
│   │   ├── dashboard/          # Main dashboard
│   │   ├── settings/           # Application settings
│   │   └── ...                 # Other application routes
│   ├── components/             # Reusable UI components
│   └── lib/                    # API clients and feature-level utilities
│       ├── accounts.ts         # Account-related API functions
│       ├── api.ts              # Shared API configuration and requests
│       ├── auth-storage.ts     # Authentication storage utilities
│       ├── auth.ts             # Authentication-related functions
│       ├── budgets.ts          # Budget-related API functions
│       ├── categories.ts       # Category-related API functions
│       ├── dashboard.ts        # Dashboard data functions
│       ├── goals.ts             # Financial goal API functions
│       ├── notifications.ts    # Notification-related API functions
│       ├── recurring.ts        # Recurring transaction API functions
│       ├── reports.ts          # Reports and analytics API functions
│       └── transactions.ts     # Transaction-related API functions
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.mjs
├── next.config.ts
└── README.md
```

### Library Modules

The `src/lib/` directory organizes shared application logic and API integration by feature.

| Module | Responsibility |
|---|---|
| `api.ts` | Shared API configuration and request utilities |
| `auth.ts` | Authentication-related operations |
| `auth-storage.ts` | Authentication data storage utilities |
| `accounts.ts` | Account management integration |
| `categories.ts` | Category management integration |
| `transactions.ts` | Transaction management integration |
| `budgets.ts` | Budget management integration |
| `goals.ts` | Financial goals and related operations |
| `recurring.ts` | Recurring transaction integration |
| `dashboard.ts` | Dashboard data integration |
| `reports.ts` | Reports and analytics integration |
| `notifications.ts` | Notification integration |

This modular structure keeps feature-specific API operations separate from page components and helps maintain consistency when integrating the frontend with the Pocketa API.
```

This is a high-level representation, not an exhaustive file listing. Actual routes and components are defined by the current repository contents.

## Backend Integration

Pocketa Web communicates with Pocketa API for authenticated financial operations.

Examples include:

- Retrieving and updating financial accounts.
- Managing transactions and categories.
- Creating and maintaining budgets.
- Managing recurring transaction schedules.
- Retrieving financial goals and contributions.
- Accessing reporting data.
- Retrieving notifications.

API requests must follow the endpoint contracts and authentication requirements defined by the backend.

For local development, ensure that the frontend API URL points to the correct backend address and that cross-origin requests are configured appropriately.

## Security and Data Handling

- Do not commit `.env.local` or other files containing secrets.
- Treat frontend validation as a usability feature, not a security boundary.
- Enforce authentication and resource ownership on the backend.
- Avoid exposing sensitive financial information in browser logs.
- Handle failed requests without assuming that a write operation succeeded.
- Use the backend's response as the source of truth for persisted financial records.

## Development Workflow

A typical development workflow is:

1. Pull the latest repository changes.
2. Install dependencies if the package configuration has changed.
3. Configure the required environment variables.
4. Start the backend API.
5. Run the frontend development server.
6. Implement and test the desired feature.
7. Run linting and the production build.
8. Review the changes before committing.

## Quality Assurance

Before submitting changes, run:

```bash
npm run lint
npm run build
```

Also verify relevant application workflows, including:

- Authentication and access to protected pages.
- Transaction creation and editing.
- Account and category operations.
- Budget validation and management.
- Recurring transaction configuration and status changes.
- Reports and analytics loading.
- Session expiry and API failure handling.
- Responsive navigation and settings behavior.

The tests performed should correspond to the features affected by the change.

## Related Repository

**Pocketa API**

The backend repository provides the REST API, business logic, database access, authentication, and recurring transaction scheduler.

Replace the placeholder with the actual Pocketa API GitHub URL when publishing the project.

## Project Status

Pocketa is an actively developed personal finance management application.

The project includes core financial management modules, reporting and analytics functionality, settings, backend integration, and automated recurring transaction processing. Features and interfaces may evolve as development continues.

## License

Add the applicable license information here if the repository is distributed under an open-source license.

---

**Pocketa — Personal finance management, organized.**