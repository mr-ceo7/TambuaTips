# Course 00: The Mental Blueprint and Web Architecture

Welcome to the Zero-to-Hero Fullstack Development Course. Our goal isn't just to teach you what code to type, but **how to think like an engineer.** 

Before you write a single line of code, you must understand the "Big Picture". If you don't know what you are building, you will get lost in the details.

## Concept: The Digital Restaurant

Every modern web application (like TambuaTips, Facebook, or Netflix) operates exactly like a high-end restaurant. There are three main pillars:

### 1. The Frontend (The Dining Room)
- **What it is:** The visual layout, the buttons, the colors, and the animations that run directly on your user's phone or laptop inside their web browser (Chrome, Safari).
- **The Tech Stack:** React, Vite, TypeScript, Tailwind CSS.
- **The Analogy:** The Dining Room is pretty, welcoming, and intuitive. It holds the menus. But importantly, the dining room doesn't cook the food. If you click a button in the dining room, it has to ask the kitchen for the result.
- **In your code:** This is everything inside the `/src` folder.

### 2. The Backend / API (The Kitchen & The Waiter)
- **What it is:** The secure computer (server) living in the cloud. It runs the business logic, crunches numbers, and talks to external services (like Safaricom M-Pesa).
- **The Tech Stack:** Python, FastAPI.
- **The Analogy:** The Kitchen is behind locked doors. Customers cannot enter. The Waiter (the API) takes the customer's order from the Dining Room, walks through the restricted doors, hands it to the Head Chef (FastAPI), and safely returns with the requested food (Data).
- **In your code:** This is everything inside the `/backend/app/routers` folder.

### 3. The Database (The Pantry & The Ledger)
- **What it is:** The secure, permanent storage system for all data. If the server loses power and restarts, the database remembers everything.
- **The Tech Stack:** MySQL, SQLite, SQLAlchemy.
- **The Analogy:** The Pantry holds the ingredients (user profiles, sports tips). The Ledger records transactions (who paid for what). The chefs constantly lock the pantry, fetch what they need, update the ledger, and lock it again.
- **In your code:** This is everything inside the `/backend/app/models` folder.

## The Full Journey of a Single Click

When a user visits `tambuatips.com`:
1. They download your **Frontend** (React) into their browser.
2. They click "Show Me Today's Tips".
3. React summons the **Axios Waiter**, giving him an envelope (HTTP Request).
4. The Waiter drives across the internet and knocks on the door of your cloud server (**FastAPI Backend**).
5. FastAPI verifies the user's VIP wristband (Authentication Token).
6. FastAPI goes into the **Database**, reads today's tips, and hands them to the Waiter.
7. The Waiter drives back to the user's phone.
8. React takes the tips and paints them beautifully on the screen using **Tailwind CSS**.

### Summary
You now understand the architecture. You don't build "one app." You build a visual Client, a logical Server, and a permanent Storage system, and you connect them with roads. 

Next, we will learn the language of the Frontend: **TypeScript.**
