README.md
CollegeAlgorithm: An In-Depth Look
This project is a back-end application built with Node.js to demonstrate a practical data collection workflow. Its core purpose is to list the best universities for the user based on preffered academic criteria. This criteria is systematically scraped and stored in a structured, local SQLite database. This README provides a detailed breakdown of the application's inner workings, from its modular design to its data handling pipeline.

💡 Core Purpose
The primary goal of this application is to showcase a robust and maintainable approach to web scraping. It highlights key skills in:

Asynchronous Programming: Managing the non-blocking nature of web requests and I/O operations.

Data Modeling: Designing a simple, effective database schema for collected data.

Robustness: Implementing practices to handle potential failures (e.g., broken network requests, changes to the target website's structure).

Modular Architecture: Separating application concerns into distinct files and scripts for clarity and reusability.

📊 System Architecture & Data Flow
The application follows a linear data pipeline:

Database Initialization: The initdb.js script is run once to prepare the local schools.db database, creating a table with a predefined schema.

Web Scraping & Data Extraction: The main index.js script launches a headless browser, navigates to a target URL, and extracts relevant data points from the webpage's HTML.

Data Storage: Extracted data is then cleaned, formatted, and inserted into the schools table in the SQLite database.

Application Termination: The browser and database connections are closed to free up system resources.

This modular flow ensures that the database setup is handled separately from the data collection process, making it easy to run the scraper multiple times without re-initializing the database.

⚙️ Component Breakdown: How It Works
initdb.js
This script is the database initializer. Its sole responsibility is to ensure that a clean database file and a schools table exist before the scraping process begins.

Inner Workings:

It uses the sqlite3 library to connect to the schools.db file.

It executes a SQL command (CREATE TABLE IF NOT EXISTS...) to create a table named schools with columns such as name, location, and other relevant data points. The IF NOT EXISTS clause prevents errors if the script is run multiple times.

The script logs a confirmation message to the console upon successful creation and then closes the database connection.

index.js
This is the main application file containing the core scraping logic. It orchestrates the entire data collection process.

Inner Workings (Conceptual Flow):

Setup & Connection: The script imports necessary libraries, including puppeteer and sqlite3, and establishes a connection to the schools.db database.

Launch Headless Browser: It uses puppeteer.launch() to start a new instance of a headless Chromium browser. This lightweight browser can load web pages without a visible user interface, making it ideal for automation.

Load Cookies: The script checks for a cookies.json file. If it exists, it loads the cookies into the browser session. This is a critical step for scraping websites that require a login or maintain state, allowing the scraper to bypass authentication barriers and access protected content.

Page Navigation: It uses the page.goto() method to navigate to the target URL. await is used to ensure the page has fully loaded before proceeding.

Data Extraction: The script leverages Puppeteer's page.evaluate() method to run JavaScript code directly within the context of the loaded page. Inside this function, it uses standard DOM selectors (document.querySelectorAll) to find specific HTML elements (e.g., a list of universities). It then iterates over these elements to extract data points (e.g., the text content of a heading or the src attribute of an image).

Data Insertion: For each data record collected, the script executes a prepared SQL statement (INSERT INTO schools (...) VALUES (...)) to store the data in the database. Parameterized queries are used to prevent SQL injection vulnerabilities, a key security practice.

Error Handling: The entire scraping process is likely wrapped in try...catch blocks to gracefully handle potential issues like network timeouts, elements not found on the page, or database errors.

Cleanup: After the scraping is complete, the browser.close() and db.close() methods are called to properly shut down all connections and free up resources.

🛠️ Getting Started
To run the application, you must have Node.js and npm installed.

Clone the Repository:

Bash

git clone https://github.com/jaredmerrill/CollegeAlgorithm.git
cd CollegeAlgorithm
Install Dependencies:

Bash

npm install
Initialize the Database:

Bash

npm run initdb
Run the Scraper:

Bash

npm start
(Note: This command will execute the logic in index.js. The package.json file will contain a script that links npm start to node index.js.)
