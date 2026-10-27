# Payment management

A private website where a group records payments and accounts. Sign in with an approved account, then use Payments, Accounts, and, if you are a group boss, Members.

## What you need

- [Node.js](https://nodejs.org) 20.9 or newer
- npm, which is included with Node.js
- The database files from someone who already uses this site

Git does not include the database. Accounts, payments, and passwords live only in those files.

## Start the site

In the project folder, install the dependencies:

```bash
npm install
```

Create a `data` folder next to `package.json` and put these three files in it:

```text
data/app.db
data/app.db-wal
data/app.db-shm
```

Copy them while the original site is stopped, and keep all three together. Recent payments are stored across these files, so a copy of `app.db` alone can be incomplete.

Start the site:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Another computer on the same network can open `http://<this-computer-ip>:3000`.

To run the production build instead:

```bash
npm run build
npm start
```

## Sign in

Use the email and password of an account that is already **Approved** in the database.

A **Pending** account cannot sign in until a group boss approves it. A **Rejected** account cannot sign in.

### Create an account

Open [http://localhost:3000/signup](http://localhost:3000/signup).

Enter your name, nickname, email, and a password of 8 to 128 characters, then enter the password again. Choose your group. Name, nickname, and email must each be unique.

The new account is a member and stays pending until a group boss approves it on the Members page.

## Using the site

The sidebar has:

- **Home** shows your nickname, email, group, and role, plus links to payment widgets.
- **Payments** is where widgets and transactions live.
- **Accounts** is your own account list.
- **Members** is visible to a group boss.
- **Profile**, at the bottom, is where you update your own details.
- The sun and moon icons switch between light and dark. The site opens in light mode, and this browser remembers your choice.
- **Sign out** ends the session.

### Payments

A group boss creates a widget, for example `2026/10 Payments`. People in that group open the widget and add their own payments.

Each widget card shows the total, bank transactions, and internal transactions by group. The refresh icon in the card’s top-right corner reloads those totals. The rest of the card opens the widget.

**Add payment** sits above your table.

- A **bank transaction** needs Info, Account, Date, and Amount. Note is optional.
- An **internal transaction** needs a member, Date, and Amount. The table shows that member’s nickname in the note column.

Amounts can be negative and keep up to two decimal places. Dates are shown as mm/dd/yyyy. Use **Edit** and **Delete** on your own rows.

A group boss also sees one table for each other approved member. **List** shows every table. **Tabs** shows one person at a time. The choice is saved in this browser and is shared with Accounts. Another member’s table is view-only. **Add payment** still adds a payment to your own records.

**Summary** adds internal transactions to the same person into one row. **Detailed** lists each internal transaction and is the usual view. Bank transactions stay as entered in both views. The switch appears when the table contains an internal transaction.

**Export** asks for a filename and a password, then downloads an Excel file. **Include accounts tab** starts checked, so the file has a transactions sheet and an accounts sheet. Uncheck it to leave the accounts sheet out. Open the file with the password you entered.

### Accounts

**Add account** sits above your table. You can edit, delete, and drag your own rows. Drag a row to change its order. A new account is added at the end.

Account is required. Nationality, Status, Hours, Jobs, Bids, Interview, Work in progress, and Note are optional. Nationality is chosen from a country list, with US first.

A group boss also sees the other approved members’ accounts, using the same List and Tabs switch as Payments. Those tables are view-only.

### Members

A group boss uses **Members** for the people in their group. The columns are No, Name, Nickname, Email, Role, and Status. Drag a row to set the order used when payments are exported.

Change a person’s status to Approved, Pending, or Rejected. Pending and Rejected sign that person out. You can also change their email or password, or delete the account. An account that payments still refer to cannot be deleted. Your own status is shown as text.

### Profile

Update your name, nickname, email, and password. Group and role are shown and stay as they are. A new password must be 8 to 128 characters, and the confirmation must match. After a save, a message appears and you remain on the page.

## If there is no database

Starting the site creates an empty `data/app.db`. That file has no groups and no accounts, so sign-up has nowhere to join and nobody can approve a new account. To use the website, place a copy of the existing `app.db`, `app.db-wal`, and `app.db-shm` files in `data/` and start again.
