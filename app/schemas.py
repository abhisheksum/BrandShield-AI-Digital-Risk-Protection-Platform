from pydantic import BaseModel, Field, field_validator

class AssetIn(BaseModel):
    kind: str
    platform: str = ""
    name: str = ""
    handle: str = ""
    url: str = ""
    identifier: str = ""
    publisher: str = ""

    @field_validator("kind")
    @classmethod
    def valid_kind(cls, v):
        if v not in {"social", "app"}: raise ValueError("kind must be social or app")
        return v
    @field_validator("url")
    @classmethod
    def valid_url(cls, v):
        if v and not v.startswith(("https://", "http://")): raise ValueError("URL must use http or https")
        return v

class AssetUpdate(BaseModel):
    platform: str | None = None
    name: str | None = None
    handle: str | None = None
    url: str | None = None
    identifier: str | None = None
    publisher: str | None = None
    @field_validator("url")
    @classmethod
    def valid_url(cls, v):
        if v and not v.startswith(("https://", "http://")): raise ValueError("URL must use http or https")
        return v
class BrandIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = ""
    industry: str = ""
    website: str = ""
    aliases: list[str] = []

class BrandUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = ""
    industry: str = ""
    website: str = ""
    aliases: list[str] = []

class ReviewUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v not in {"open", "investigating", "resolved", "dismissed"}:
            raise ValueError("status must be open, investigating, resolved, or dismissed")
        return v
