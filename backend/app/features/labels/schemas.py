from pydantic import BaseModel


class LabelImage(BaseModel):
    code: str
    png: bytes
