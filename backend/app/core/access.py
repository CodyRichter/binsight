from typing import Annotated

from fastapi import Depends, Request

from app.models import Actor, ActorKind


def app_actor(request: Request) -> Actor:
    # Set by the role check every router in main.py runs before its routes.
    return Actor(ActorKind.app, request.state.username)


def is_visitor(request: Request) -> bool:
    return request.state.username is None


AppActor = Annotated[Actor, Depends(app_actor)]
IsVisitor = Annotated[bool, Depends(is_visitor)]
