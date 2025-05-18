# JetPay_OnlineWallet

## To Run:

**Requirements:**
*   Node.js (get a recent version, like 18 or newer).
*   npm (comes with Node.js).

**Backend First:**
1.  Go into the `jetpay/backend` folder in your terminal.
2.  **Important .env file:** Create a file named `.env` (yes, just `.env`) inside `jetpay/backend/`. Put this in it (you can change the `JWT_SECRET` to something else if you like, make it long and random!):
    ```env
    PORT=5001
    JWT_SECRET="this-is-my-super-secret-key-for-jetpay-shhh"
    JWT_EXPIRES_IN="2m"  # <-- This sets the 2-minute session!
    ```
3.  Type `npm install` to get all the code bits it needs.
4.  then `npm run dev`

**Now the Frontend:**
1.  Go into the `jetpay/frontend` folder in your terminal.
2.  **Another .env file:** Create a file named `.env.local` inside `jetpay/frontend/`. Put this in it:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:5001/api
    ```
3.  Type `npm install` here too.
4.  Then `npm run dev`

**Let's Go!**
1.  **Start the backend:** In your `jetpay/backend` terminal, type `npm run dev`. You should see messages that it's running on port 5001.
2.  **Start the frontend:** In your `jetpay/frontend` terminal, type `npm run dev`. This usually starts on port 3000.
3.  Open your web browser and go to `http://localhost:3000`.

## How to Use It:

**Default Login (if you use my sample data):**
*   Username: `testuser03`
*   Password: `@pass123`

**Making a New Account:**
1.  Go to the "Register" page.
2.  Pick a username and an alphanumeric password (letters and numbers, at least 6 characters).
3.  That's it! You'll be logged in. Your info gets saved in that `users.json` file.

**Remember the 2-Minute Session!**
If you're using the app and step away, or it's been more than 2 minutes, you'll be logged out automatically. You'll just need to log back in.

