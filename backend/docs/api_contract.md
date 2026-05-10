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