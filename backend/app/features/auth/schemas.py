from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

CredentialName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class AuthStatus(BaseModel):
    owner_exists: bool
    signed_in: bool


class Password(BaseModel):
    password: str = Field(min_length=8, max_length=256)


class NewMcpCredential(BaseModel):
    name: CredentialName


class McpCredential(BaseModel):
    id: str
    name: str
    created_at: datetime


class McpCredentialCreated(McpCredential):
    secret: str
