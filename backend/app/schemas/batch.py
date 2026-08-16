from typing import Optional

from pydantic import BaseModel


class BatchOut(BaseModel):
    batch_id: int
    division_id: int
    name: str
    strength: Optional[int]

    model_config = {"from_attributes": True}
