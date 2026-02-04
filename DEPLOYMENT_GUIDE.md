# Praesentix Installation & Deployment Guide

This guide details how to install and deploy the **Praesentix Camera Recognition Attendance System** in colleges and universities.

## Architecture

For the best performance and privacy compliance in an educational setting, a **Hybrid Local Deployment** is recommended:

1.  **Central Server**: A powerful PC/Server hosted within the college intranet (LAN). All data stays on campus.
2.  **Classroom Clients**: Teachers connect using existing classroom PCs or laptops via the Web Browser.
3.  **Cameras**: Webcams or IP cameras connected to the classroom PCs.

**Why this approach?**
-   **Security**: Face data stays within the college network.
-   **Speed**: Faster attendance marking (no internet latency).
-   **Reliability**: Works even if the external internet is down.

---

## 🏗️ Method 1: Docker Deployment (Recommended)

This is the easiest way to install the entire system (Frontend, Backend, Database) on a single server.

### Prerequisites (Server)
-   **OS**: Linux (Ubuntu Recommended), Windows Pro, or macOS.
-   **Software**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine.
-   **Hardware**: Minimum 8GB RAM, 4-Core CPU.

### Installation Steps

1.  **Download the Source Code**:
    Copy the `Final Model` folder to the server.

2.  **Configuration**:
    -   Open `docker-compose.yml`
    -   Change `JWT_SECRET_KEY` to a random secure string.
    -   Ensure ports `8080` (Frontend) and `5002` (Backend) are open on the firewall.

3.  **Build and Run**:
    Open a terminal in the folder and run:
    ```bash
    docker-compose up --build -d
    ```
    *This might take 10-15 minutes the first time to download AI models.*

4.  **Access the System**:
    -   **On the Server**: http://localhost:8080
    -   **From Classrooms**: http://<SERVER_IP_ADDRESS>:8080

### Network Setup for Classrooms
-   Connect the Server to the College LAN.
-   Assign a **Static IP** (e.g., `192.168.1.100`) to the server.
-   Instruct teachers to open `http://192.168.1.100:8080` in Chrome/Edge.

---

## 💻 Method 2: Manual Installation (Windows/Mac)

Use this if you cannot use Docker and need to run it directly on a PC.

### 1. Install Dependencies
-   **Python 3.10+**: [Download](https://www.python.org/downloads/) (Check "Add Python to PATH")
-   **Node.js 18+**: [Download](https://nodejs.org/)

### 2. Setup Backend
1.  Open Terminal/Command Prompt.
2.  Navigate to `Backend` folder.
3.  Install requirements:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the Server:
    ```bash
    python app.py
    ```
    *The server runs on port 5002.*

### 3. Setup Frontend
1.  Open a new Terminal.
2.  Navigate to `Frontend` folder.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the App:
    ```bash
    npm run dev -- --host
    ```
    *(The `--host` flag makes it accessible to other computers).*

---

## 📷 Classroom Setup Guide

1.  **Hardware**:
    -   PC/Laptop with Google Chrome.
    -   Webcam (USB or Integrated) positioned to face the class.

2.  **Usage**:
    -   Teacher logs in.
    -   Selects "Class" and "Period".
    -   Clicks "Start Camera Attendance".
    -   The system captures faces and marks attendance automatically.

## 🚀 Cloud Deployment (Optional)

If you prefer a cloud solution (accessible from anywhere):
1.  **Backend**: Deploy to **Render.com** (Select 'Python 3', Build Command: `pip install -r requirements.txt`, Start Command: `gunicorn app:app`).
    *Note: Free tier might crash due to low RAM (512MB). Upgrade to a paid plan.*
2.  **Frontend**: Deploy to **Vercel** (Import Git repo, Framework Presets: Vite).

---

## ❓ Troubleshooting

-   **"Camera Permission Denied"**:
    -   Ensure the site is running on `localhost` or `HTTPS`. Browsers block camera access on `HTTP` unless it is localhost.
    -   *Pro Tip*: For LAN access via HTTP, you may need to configure Chrome flag `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.

-   **Backend Slow**:
    -   Face recognition is computationally heavy. Ensure the server has AVX2 support.
    -   Upgrading to a PC with an NVIDIA GPU and installing `tensorflow-gpu` can speed it up 10x.
