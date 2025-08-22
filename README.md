# BesPick

## Overview

**BesPick** is a web application developed for the **BESPIN Morale Team**.  
Its purpose is to **host giveaways and voting events** for the BESPIN community, providing a secure and interactive way for participants to engage in morale activities.  

The app integrates with **Firebase** for authentication and **PayPal** for payment handling, ensuring both secure access and flexible payment options when giveaways or entries require them.

---

## Features

- 🔑 **Authentication via Firebase** – Users must log in with their BESPIN credentials to participate.  
- 🎟️ **Giveaways** – Host raffles and random draws with configurable rules.  
- 🗳️ **Voting Events** – Set up polls and surveys for team participation and decision-making.  
- 💳 **PayPal Integration** – Accept entry fees or donations securely.  
- 🖥️ **Admin Dashboard** – Manage events, track participants, and monitor activity.  

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)  
- npm or yarn package manager  
- A running Firebase and Convex server  
- A PayPal developer account with sandbox credentials  

---

## Environment Setup

Ensure you are in the "bespick" folder by using `cd bespick`.  
This file is **gitignored** and required to run the application locally.  

### .env.local

Create a `.env.local` file in the **root of the repository**

```env
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=bespick
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=bespick-client
```

## Running the Application

1. Ensure you are in the "bespick" folder by using `cd bespick`
2. Install Dependencies with `npm install`
3. Run the development server with `npm run dev`
4. Open in Your Browser: <http://localhost:3000>

### Recomendations

- It is recommended that the VSCode plugin "Tailwind CSS IntelliSense" is installed to aid in development
- Ensuring VSCode auto saves after editing will make the localhost preview update more often.

## Authors

- SSgt Select Chris Hodge
- SrA Jordan Leonard
- A1C Andrew Odom

## License

### MIT License

*Copyright (c) 2025 BesPick*  

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
