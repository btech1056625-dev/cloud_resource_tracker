# Cloud Resource Tracker ☁️📊

A professional-grade, multi-cloud resource monitoring and cost analysis platform. This application allows users to track their cloud infrastructure, visualize monthly spending, and manage resources across multiple providers with a sleek, glassmorphism-inspired interface.

## 🚀 Features

-   **Professional Dashboard**: Real-time visualization of total resources, monthly spend, and active instances.
-   **Cost Analysis**: Dynamic line charts powered by Chart.js to track spending trends across different services.
-   **Resource Management**: Full CRUD (Create, Read, Delete) capabilities for cloud resources.
-   **Secure Authentication**: Integrated with AWS Cognito using the modern Authorization Code flow.
-   **Dynamic Profile**: User-specific profile information fetched directly from identity tokens.
-   **Premium UI**: Custom-built glassmorphism design system using Vanilla CSS.

## 🛠️ Technology Stack

-   **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+), Chart.js, FontAwesome.
-   **Backend**: PHP 7.4+, MySQL.
-   **Authentication**: AWS Cognito (Managed Login).
-   **Dependencies**: Composer (Firebase PHP-JWT).

## 📋 Prerequisites

-   A web server (Apache/Nginx) with PHP support.
-   MySQL Database.
-   Composer installed.
-   AWS Cognito User Pool configured.

## ⚙️ Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone [repository-url]
    cd cloud_resource_tracker
    ```

2.  **Install Dependencies**:
    ```bash
    composer install
    ```

3.  **Database Configuration**:
    -   Import the database schema into your MySQL instance.
    -   Update `db.php` with your database host, name, username, and password.

4.  **Cognito Configuration**:
    -   Update `backend/auth.php` and `frontend/js/auth.js` with your Cognito Domain, Client ID, and User Pool ID.

5.  **Web Server Setup**:
    -   Ensure `.htaccess` (included) is enabled to allow the `Authorization` header to pass through to PHP.
    -   Configure your virtual host to point to the `frontend/` directory or the project root as needed.

## 🔒 Security

-   All API endpoints are protected by JWT verification.
-   The application handles Authorization tokens securely in `localStorage` and `sessionStorage`.
-   CORS headers are strictly managed to allow communication only with trusted origins.

## 📄 License

This project is open-source and available under the MIT License.
