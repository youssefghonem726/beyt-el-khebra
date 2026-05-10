from rest_framework.response import Response


def success_response(
    message="Operation completed successfully",
    data=None,
    status_code=200
):
    return Response(
        {
            "success": True,
            "message": message,
            "data": data if data is not None else {}
        },
        status=status_code
    )


def error_response(
    message="Something went wrong",
    errors=None,
    status_code=400
):
    return Response(
        {
            "success": False,
            "message": message,
            "errors": errors if errors is not None else {}
        },
        status=status_code
    )