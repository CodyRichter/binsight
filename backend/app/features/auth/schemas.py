from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from app.models import Role

CredentialName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
Username = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=1, max_length=40, pattern=r"^[A-Za-z0-9._-]+$"
    ),
    AfterValidator(str.lower),
]
Password = Annotated[str, Field(min_length=8, max_length=256)]


class SignedInAccount(BaseModel):
    id: str
    username: str
    role: Role


class AuthStatus(BaseModel):
    setup_needed: bool
    account: SignedInAccount | None


class SignIn(BaseModel):
    username: Username
    # Any length is accepted here, so an old password is still checked rather than refused.
    password: str = Field(max_length=256)


class FirstAdmin(BaseModel):
    username: Username
    password: Password


class NewAccount(BaseModel):
    username: Username
    password: Password
    role: Role


class AccountChanges(BaseModel):
    role: Role | None = None
    password: Password | None = None


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=256)
    new_password: Password


class Account(BaseModel):
    id: str
    username: str
    role: Role
    created_at: datetime


class NewMcpCredential(BaseModel):
    name: CredentialName


class McpCredential(BaseModel):
    id: str
    name: str
    created_at: datetime


class McpCredentialCreated(McpCredential):
    secret: str
