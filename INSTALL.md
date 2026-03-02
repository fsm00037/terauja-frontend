# Installation Guide - Terauja Frontend

Follow these steps to set up and run the Psychologist Dashboard locally.

## 📋 Prerequisites
- **Node.js** (LTS version recommended)
- **npm** (comes with Node.js)

## 🛠️ Step-by-Step Setup

### 1. Install Dependencies
Navigate to the project directory and run:

```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory if specific API URLs or keys are required for local development.

### 3. Running the Development Server
Start the application in development mode:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000) (or the port specified in the terminal).

## 🚀 Production Build

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```
