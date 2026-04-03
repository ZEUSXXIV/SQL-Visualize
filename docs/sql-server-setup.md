# 🛠️ SQL Server Setup for SQL Visualize

To use SQL Visualize with a local **SQL Server Express** or any instance using Windows Authentication by default, you must perform these one-time configuration steps.

## 1. Enable SQL Server Authentication
SQL Visualize uses a standalone Node.js driver which requires a SQL login.
1. Open **SQL Server Management Studio (SSMS)**.
2. Right-click your Server -> **Properties** -> **Security**.
3. Select **SQL Server and Windows Authentication mode**.
4. Restart the SQL Server service.

## 2. Enable TCP/IP Protocol
The standalone driver communicates via TCP/IP, which is disabled by default in SQL Express.
1. Open **SQL Server Configuration Manager**.
2. Go to **SQL Server Network Configuration** -> **Protocols for SQLEXPRESS**.
3. Right-click **TCP/IP** and select **Enable**.
4. Under **SQL Server Services**, right-click **SQL Server (SQLEXPRESS)** and select **Restart**.

## 3. Enable SQL Server Browser
This allows the driver to resolve named instances (like `\SQLEXPRESS`).
1. In **SQL Server Configuration Manager**, go to **SQL Server Services**.
2. Right-click **SQL Server Browser** -> **Properties**.
3. In the **Service** tab, change **Start Mode** to **Automatic**.
4. Click **OK**, then right-click the service and select **Start**.

## 4. Create a SQL User
1. In SSMS, go to **Security** -> **Logins**.
2. Right-click -> **New Login**.
3. Choose **SQL Server authentication**, set a password, and uncheck "Enforce password expiration".
4. Under **Server Roles**, check **sysadmin** (or ensure the user has `CONNECT` and `SELECT` permissions on system catalogs).

---

## Example Connection String
```text
Server=YOUR_COMPUTER_NAME\SQLEXPRESS;Database=master;User Id=your_user;Password=your_password;Encrypt=True;TrustServerCertificate=True;
```
> [!TIP]
> Always include `TrustServerCertificate=True` for local development to avoid SSL/TLS handshake errors with self-signed certificates.
