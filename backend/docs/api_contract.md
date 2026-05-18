# Lawlinator / PrintApp API Contract

## Base URL

```txt
http://127.0.0.1:8000
Authentication

All protected endpoints require Supabase JWT access token.

Header: Authorization: Bearer <access_token>
The token is generated from Supabase Auth login and verified in Django using Supabase JWKS

##Standard Success Response:{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}

**Standard Error Response:{
  "success": false,
  "message": "Error message",
  "errors": {}
}

Users
Get Current User
GET /api/users/me/

Success:

{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": 2,
    "supabase_uid": "1db6f796-bb0a-4f9c-a934-1af4c9f63c8a",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@test.com",
    "phone": null,
    "role": "client",
    "is_active": true
  }
}
*/
Orders
Create Order
POST /api/orders/

Request:

{
  "status": "UNPRICED_PENDING",
  "quantity": 2,
  "total_price": 150
}

Success:

{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "status": "UNPRICED_PENDING",
    "quantity": 2,
    "total_price": "150.00",
    "customer": 2,
    "approved_by": null
  }
}
Get All Orders
GET /api/orders/
Get Single Order
GET /api/orders/<id>/
Update Order
PUT /api/orders/<id>/

Request:

{
  "status": "CONFIRMED",
  "quantity": 5,
  "total_price": 350
}
Delete order 
DELETE /api/orders/<id>/

Success:

{
  "success": true,
  "message": "Order deleted successfully",
  "data": {}
}
Uploads
Upload ile
POST /api/uploads/

Body type:

form-data

Fields:

file       File
file_type  Text

Allowed file_type values:

cover
content
preview
package_image

Success:

{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 1,
    "url": "/media/uploads/example.pdf",
    "file_type": "content",
    "uploaded_by": 2
  }
}
Get All Uploads
GET /api/uploads/
Get Single Upload
GET /api/uploads/<id>/
Delete Upload
DELETE /api/uploads/<id>/

Success:

{
  "success": true,
  "message": "File deleted successfully",
  "data": {}
}
/*
    HTTP Status Codes
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Server Error
*/
Ownership Rules
Orders are linked to the authenticated user.
Uploaded files are linked to the authenticated user.
Users can only access their own orders and files.
*/
    Testing Status:
Tested successfully:
Supabase login
JWT token generation
Django JWT middleware
GET /api/users/me/
Orders CRUD
Upload file
Get uploaded file
Delete uploaded file
Media file access in development
*/
Supabase Auth Hook Note

The custom_access_token_hook was fixed.

Final behavior:

Reads user role from public.users
Matches by supabase_uid
Adds user_role to JWT claims
Works with Supabase login
Does not block token generation
///////////////////////////////////////////
---

# Dashboard Statistics

## Get Dashboard Statistics

```txt
GET /api/dashboard/stats/
```

Authentication required.

Access:
- owner
- staff

Clients are not allowed to access dashboard statistics.

---

## Purpose

This endpoint returns live dashboard statistics calculated dynamically from the database.

No `dashboard_statistics` table is used.

All statistics are generated from:
- orders
- order_items
- quotes
- quote_items
- order_status_history

This ensures dashboard values are always accurate and up to date.

---

## Statistics Included

### Orders

```txt
total_orders
unpriced_orders
confirmed_orders
in_progress_orders
completed_orders
cancelled_orders
```

### Payments

```txt
total_order_value
total_paid_amount
total_remaining_amount
unpaid_orders
partial_paid_orders
paid_orders
```

### Production

```txt
total_items
total_quantity
total_completed_quantity
overall_progress_percentage
items_in_printing
items_in_packaging
items_ready
```

### Quotes

```txt
total_quotes
pending_quotes
approved_quotes
rejected_quotes
```

### Recent Activity

```txt
latest_orders
latest_quotes
latest_status_updates
```

---

## Example Response

```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "orders": {
      "total_orders": 3,
      "unpriced_orders": 2,
      "confirmed_orders": 1,
      "in_progress_orders": 0,
      "completed_orders": 0,
      "cancelled_orders": 0
    },
    "payments": {
      "total_order_value": 15000.0,
      "total_paid_amount": 2000.0,
      "total_remaining_amount": 13000.0,
      "unpaid_orders": 2,
      "partial_paid_orders": 1,
      "paid_orders": 0
    },
    "production": {
      "total_items": 6,
      "total_quantity": 4500,
      "total_completed_quantity": 1750,
      "overall_progress_percentage": 38,
      "items_in_printing": 3,
      "items_in_packaging": 1,
      "items_ready": 0
    },
    "quotes": {
      "total_quotes": 0,
      "pending_quotes": 0,
      "approved_quotes": 0,
      "rejected_quotes": 0
    },
    "recent_activity": {
      "latest_orders": [],
      "latest_quotes": [],
      "latest_status_updates": []
    }
  }
}
```

---

## Dynamic Calculations

### Remaining Revenue

```txt
total_remaining_amount =
sum(total_price) - sum(paid_amount)
```

### Overall Production Progress

```txt
overall_progress_percentage =
sum(completed_quantity) / sum(quantity)
```

### Items In Production Steps

Calculated dynamically from:

```txt
order_items.current_step
```

Examples:
- printing
- packaging
- ready

---

## Permission Rules

```txt
owner  -> allowed
staff  -> allowed
client -> forbidden
```

Clients receive:

```txt
403 Forbidden
```

if they try to access dashboard statistics.

---

## Testing Status

Tested successfully:
- dashboard authentication
- owner/staff role protection
- dynamic orders statistics
- dynamic payments statistics
- production progress calculations
- quotes statistics
- recent activity retrieval