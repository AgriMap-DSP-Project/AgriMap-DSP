from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, DBAPIError


def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers global exception handlers to map raw database driver exceptions 
    into clean client-facing HTTP responses.
    """
    
    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError):
        # Extract underlying DB error message
        orig_msg = str(exc.orig) if exc.orig else str(exc)
        
        # Check for specific constraint violations
        if "chk_user_role" in orig_msg:
            detail = "Invalid user role. Must be 'admin', 'surveyor', 'verifier', or 'farmer'."
        elif "chk_project_status" in orig_msg:
            detail = "Invalid project status. Must be 'planning', 'active', 'completed', or 'archived'."
        elif "chk_field_verification_status" in orig_msg or "chk_zone_verification_status" in orig_msg or "chk_resource_verification_status" in orig_msg or "chk_observation_verification_status" in orig_msg:
            detail = "Invalid verification status. Must be 'pending', 'verified', or 'rejected'."
        elif "chk_field_verification_data" in orig_msg or "chk_zone_verification_data" in orig_msg or "chk_resource_verification_data" in orig_msg or "chk_observation_verification_data" in orig_msg:
            detail = "Invalid verification data. Verified details (verified_by_id and verified_at) must be present if and only if status is verified/rejected."
        elif "chk_resource_class" in orig_msg:
            detail = "Invalid resource class. Must be one of: 'WATER', 'POWER', 'IRRIGATION', 'STRUCTURE', 'OTHER'."
        elif "chk_resource_status" in orig_msg:
            detail = "Invalid resource status. Must be one of: 'EXISTING', 'UNAVAILABLE', 'NEEDS_VERIFICATION'."
        elif "chk_reference_point_marker" in orig_msg:
            detail = "Invalid marker type. Must be one of: 'concrete_monument', 'rebar', 'brass_cap', 'temporary'."
        elif "chk_observation_category" in orig_msg:
            detail = "Invalid observation category. Must be one of: 'soil_health', 'crop_growth', 'pest_weed_infestation', 'damage', 'general'."
        elif "foreign key constraint" in orig_msg.lower():
            detail = f"Referenced entity does not exist: {orig_msg}"
        elif "duplicate key value violates unique constraint" in orig_msg.lower():
            detail = "An record with this unique identifier already exists."
        else:
            detail = f"Database integrity violation: {orig_msg}"
            
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": detail}
        )

    @app.exception_handler(DBAPIError)
    async def dbapi_exception_handler(request: Request, exc: DBAPIError):
        orig_msg = str(exc.orig) if exc.orig else str(exc)
        
        # Capture our custom spatial trigger exceptions
        if "Spatial Validation Failed" in orig_msg:
            # Clean up the PostgreSQL context trace to return just the raised error
            clean_msg = orig_msg.split("CONTEXT:")[0].strip()
            # If the error contains 'exception:', strip it too
            if "EXCEPTION:" in clean_msg:
                clean_msg = clean_msg.split("EXCEPTION:")[1].strip()
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": clean_msg}
            )
            
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": f"Database operations error: {orig_msg}"}
        )
