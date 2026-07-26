from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

settings = get_settings()


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.users.get_by_email(payload.email)

        # Same error for "no such user" and "wrong password" — never leak
        # which one it was, that's a user-enumeration vulnerability.
        invalid_credentials = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

        if not user or not verify_password(payload.password, user.password_hash):
            raise invalid_credentials

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Contact your administrator.",
            )

        token = create_access_token(subject=str(user.user_id), role=user.role.value)

        return TokenResponse(
            access_token=token,
            expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
            user=UserOut.model_validate(user),
        )
