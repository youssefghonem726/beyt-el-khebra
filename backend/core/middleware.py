import jwt
from users.models import User

SUPABASE_URL = "https://vmrgqbmsvuathzpelqzz.supabase.co"
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"


class SupabaseJWTMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwks_client = jwt.PyJWKClient(JWKS_URL)

    def __call__(self, request):
        if request.path.startswith("/admin"):
            return self.get_response(request)

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            request.user_data = None
            return self.get_response(request)

        token = auth_header.split("Bearer ")[1].strip()

        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
                leeway=60
            )

            supabase_uid = payload.get("sub")

            request.user_data = {
                "sub": supabase_uid,
                "supabase_uid": supabase_uid,
                "email": payload.get("email"),
                "role": None,
                "is_active": None,
                "local_user_id": None,
            }

            try:
                user = User.objects.get(supabase_uid=supabase_uid)
                request.user_data.update(
                    {
                        "id": user.id,
                        "local_user_id": user.id,
                        "role": user.role,
                        "is_active": user.is_active,
                    }
                )
            except User.DoesNotExist:
                pass

        except Exception as e:
            print(f"JWT Error: {e}")
            request.user_data = None

        return self.get_response(request)