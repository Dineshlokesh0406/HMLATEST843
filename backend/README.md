# Hotel Management Backend

Spring Boot + JDBC backend for the hotel management project.

## Eclipse Import

1. Open Eclipse.
2. Go to `File -> Import`.
3. Choose `Maven -> Existing Maven Projects`.
4. Select the folder:
   `C:\Users\Lenovo\Desktop\HM\backend`
5. Click `Finish`.

This backend uses:
- Java 21
- Spring Boot
- Spring JDBC
- MySQL
- Standard Maven folder layout only

There is no Lombok, no Gradle, and no custom Eclipse metadata required.

## Database Setup

Run these SQL files first in MySQL Workbench:

1. `C:\Users\Lenovo\Desktop\HM\database\01_create_schema.sql`
2. `C:\Users\Lenovo\Desktop\HM\database\02_seed_demo_data.sql`

## Database Config

The app reads database connection values from environment variables if you set them:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

Default fallback values are:

- URL: `jdbc:mysql://localhost:3306/hm_pbl?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata`
- Username: `root`
- Password: empty

If your MySQL root user has a password, set `DB_PASSWORD` before running.

## Run From Terminal

```powershell
cd C:\Users\Lenovo\Desktop\HM\backend
C:\Tools\apache-maven-3.9.12\bin\mvn.cmd spring-boot:run
```

## Main API Groups

- `/api/auth`
- `/api/customer`
- `/api/admin`
- `/api/staff`

## Example APIs

### Register

`POST /api/auth/register`

```json
{
  "fullName": "Riya Sharma",
  "email": "riya@example.com",
  "countryCode": "+91",
  "phoneNumber": "9876543211",
  "address": "12 Park Street, Chennai",
  "username": "riya",
  "password": "Riya@123",
  "confirmPassword": "Riya@123"
}
```

### Login

`POST /api/auth/login`

```json
{
  "usernameOrEmail": "aarav",
  "password": "Cust@123"
}
```

### Room Search

`POST /api/customer/rooms/search`

```json
{
  "checkInDate": "2026-05-20",
  "checkOutDate": "2026-05-23",
  "adults": 2,
  "children": 1,
  "roomType": "Deluxe"
}
```

### Create Booking

`POST /api/customer/bookings`

```json
{
  "customerCode": "CUS1001",
  "roomNumber": "205",
  "checkInDate": "2026-05-20",
  "checkOutDate": "2026-05-23",
  "adults": 2,
  "children": 1,
  "paymentMethod": "Credit Card",
  "specialRequests": "Late check-in"
}
```
