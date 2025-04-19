# Second Brain

Second Brain is a personal knowledge management app that allows you to collect, organize, and store content from various sources like Twitter, YouTube, Google Docs, and more. It serves as a centralized hub for all your ideas, notes, and resources, helping you stay productive and organized.

---

## Features

1. **Centralized Content Storage**:
   - Collect and store content from multiple sources in one place.
   - Supported sources include:
     - Tweets
     - YouTube videos
     - Google Docs
     - Links and more.

2. **Categorization and Organization**:
   - Organize content into categories like Notes, Videos, Documents, and Links.
   - Use tags to group related content for easy filtering and searching.

3. **Dynamic Tagging**:
   - Add tags dynamically. If a tag doesn’t exist, it will be created automatically.
   - Tags help you categorize and filter content efficiently.

4. **Content Sharing**:
   - Share your entire collection of notes, documents, tweets, and videos with others.
   - Generate a shareable link to allow others to import your content into their own Second Brain.

5. **User-Friendly Interface**:
   - Intuitive and clean UI for easy navigation and content management.
   - Quickly add, edit, or delete content.

6. **Secure User Accounts**:
   - Each user has their own account to manage their personal content.
   - Links and content are associated with specific users for privacy and security.

---

## How It Works

1. **Add Content**:
   - Use the "Add Content" button to add new items from supported sources.
   - Provide the link or details, and the app will automatically categorize and store it.

2. **Organize with Tags**:
   - Add tags to your content to group related items.
   - Tags are dynamically created if they don’t already exist.

3. **View and Manage Content**:
   - Navigate through categories like Notes, Videos, Documents, and Links.
   - Use tags to filter and find specific content quickly.

4. **Share Your Brain**:
   - Use the "Share Brain" feature to generate a shareable link for your collection.
   - Others can import your shared content into their own Second Brain.

---

## How to Use

1. **Sign Up or Log In**:
   - Create a new account or log in with your existing credentials.

2. **Add Content**:
   - Click the "Add Content" button.
   - Paste the link or upload content from supported sources like Twitter, YouTube, or Google Docs.
   - Assign tags to categorize the content.

3. **Organize Content**:
   - Use the sidebar to navigate through categories like Notes, Videos, Documents, and Links.
   - Filter content by tags for quick access.

4. **Edit or Delete Content**:
   - Select any item to edit its details or delete it from your collection.

5. **Share Your Collection**:
   - Use the "Share Brain" feature to generate a shareable link.
   - Share the link with others to allow them to import your content into their own Second Brain.

6. **Search for Content**:
   - Use the search bar to find specific items by title, tags, or content type.

---

## Tech Stack

- **Frontend**:
  - React.js (for building the user interface)
  - Tailwind CSS (for styling)

- **Backend**:
  - Node.js with Express.js (for API and server-side logic)
  - MongoDB with Mongoose (for database and data modeling)

- **Authentication**:
  - JSON Web Tokens (JWT) for secure user authentication.

- **Other Tools**:
  - `bcryptjs` for password hashing.
  - `crypto` for generating unique identifiers.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/second-brain.git
   cd second-brain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add the following variables:
     ```
     MONGO_URI=your-mongodb-connection-string
     JWT_SECRET=your-jwt-secret
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open the app:
   - Navigate to `http://localhost:3000` in your browser.

---