from pydantic import BaseModel, Field


class AuthStatus(BaseModel):
    owner_exists: bool
    signed_in: bool


class Password(BaseModel):
    password: str = Field(min_length=8, max_length=256)
