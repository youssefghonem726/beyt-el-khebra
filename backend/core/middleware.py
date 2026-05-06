import jwt
from django.http import JsonResponse
from users.models import User

SUPABASE_URL = "https://vmrgqbmsvuathzpelqzz.supabase.co"
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"


class SupabaseJWTMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwks_client = jwt.PyJWKClient(JWKS_URL)

    def __call__(self, request):
        if request.path.startswith('/admin'):
            return self.get_response(request)

        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            request.user_data = None
            return self.get_response(request)

        token = auth_header.split(' ')[1]

        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated"
            )

            supabase_uid = payload.get('sub')

            try:
                user = User.objects.get(supabase_uid=supabase_uid)
                request.user_data = {
                    'id': user.id,
                    'role': user.role,
                    'is_active': user.is_active,
                    'supabase_uid': user.supabase_uid,
                }
            except User.DoesNotExist:
                request.user_data = None

        except Exception as e:
            print(f"JWT Error: {e}")
            request.user_data = None

        return self.get_response(request)