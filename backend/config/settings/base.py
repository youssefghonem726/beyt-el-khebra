import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")

# Tells Django REST Framework to use Supabase tokens for auth
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.backends.SupabaseAuthentication",
    ],
}

INSTALLED_APPS = [
    "rest_framework",
    "apps.users",
    "apps.orders",
    "apps.payments",
]
