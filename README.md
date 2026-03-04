MartPOS - Complete Point of Sale System for Marts
MartPOS is a comprehensive, modern Point of Sale (POS) system specifically designed for marts, grocery stores, and retail businesses. Built with Electron, React, and TypeScript, MartPOS provides a complete solution for managing sales, inventory, purchases, and daily business operations.

🚀 Features
Core POS Functionality
Sales Management: Complete billing system with barcode scanning, customer management, and payment processing.
Inventory Control: Real-time stock tracking, product management, and automated stock updates.
Purchase Management: Supplier orders, purchase returns, and stock replenishment.
Customer Accounts: Account-based billing with credit/debit tracking.
Quotations: Price estimation and quotation generation for customers.

Advanced Features
Barcode Scanning: Fast product lookup via barcode input.
Keyboard Shortcuts: Efficient workflow with customizable hotkeys.
Multi-payment Support: Cash, card, and account-based payments.
Wholesale & Retail: Dual pricing system for different customer types.
Real-time Dashboard: Comprehensive business analytics and reporting.
Data Synchronization: Server sync capabilities for multi-location operations.

User Experience
Modern UI: Clean, responsive interface built with Shadcn UI.
Dark/Light Mode: Toggle between themes for comfortable usage.
Offline Capability: Full functionality without an internet connection.
Cross-platform: Windows, macOS, and Linux support.

📊 Dashboard Analytics
Get real-time insights into your business with:
Total sales and purchase metrics.
Order counts and values.
Stock levels and value.
Profit margin analysis.
Return tracking.
Product performance metrics.

🛠️ Tech Stack
Frontend
React 19 - Modern React with the latest features.
TypeScript - Type-safe development.
Vite - Fast build tool and dev server.
Tailwind CSS - Utility-first styling.
Shadcn UI - Beautiful, accessible UI components.
TanStack Router - Type-safe routing.
TanStack Query - Server state management.
Zustand - Client state management.
Backend & Database
Electron - Cross-platform desktop application.
SQLite - Local database with better-sqlite3.
Node.js - Server-side runtime.

📁 Project Structure
Plaintext
src/
├── features/         # Main business modules
│   ├── sales/        # Sales and billing
│   ├── products/     # Product management
│   ├── inventory/    # Stock control
│   ├── purchases/    # Purchase orders
│   ├── accounts/     # Customer accounts
│   ├── quotations/   # Price quotations
│   ├── dashboard/    # Analytics dashboard
│   ├── transactions/ # Transaction history
│   ├── users/        # User management
│   └── settings/     # System settings
├── components/       # Shared UI components
├── lib/              # Utility functions
├── hooks/            # Custom React hooks
├── stores/           # State management
└── types/            # TypeScript definitions
🚀 Getting Started
Prerequisites
Node.js 16.0.0 or higher
